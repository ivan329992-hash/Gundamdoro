# 用户机型导入：第一步验收

验收日期：2026-10-16。范围为 SPEC 第 34 节：整机图与已分好的配件导入，不包含整图圈选分件、挂点校准或用户配件混搭。

## 实现与数据边界

- 入口为“选择机型 → 添加我的机型”。支持名称、简介、整机图、1–32 个配件及配件排序、移除。
- PNG/JPEG/WebP 按实际签名与解码检查；单图不超过 8 MiB、1600 万像素，整套不超过 64 MiB。文件名由程序生成，用户文件名不参与路径构造。
- 导入只注册机型，不自动选择、解锁配件、生成成品或发放专注统计。用户配件进入永久库存，但不进入混搭选择或随机搭配。
- 网页素材保存到 OPFS；Windows 保存到应用本地 `user-models`。资源库先于进度水合加载；进度快照仍为版本 8、十个顶层字段，不保存图片字节。
- 保存后的机型暂不提供编辑、删除、导出和跨端同步；资源仅保存在当前设备/浏览器配置内。

主要入口与边界文件：`src/components/Mecha/ModelImportScreen.tsx`、`src/application/importModel.ts`、`src/domain/userModels.ts`、`src/adapters/catalog/userModelLibrary.ts`、`src/adapters/storage/userModelFiles.ts`、`src-tauri/src/user_models.rs`；接入点为依赖装配、store 初始化与模型选择页。README、SPEC 和架构文档同步更新。

## Windows 保存失败修复

此前实际 WebView2 导入在提交临时目录时报告 `os error 17`。源和目标位于同一个应用数据目录，不是将用户原图从一个磁盘直接移动到另一个磁盘。独立 PowerShell 同父目录重命名也失败，因此不能仅依赖目录重命名完成提交；观察到目录有加密属性，但未证明该属性就是根因。

正常路径保留临时目录重命名。只有文件系统返回 `CrossesDevices` 时，才使用兼容路径：

1. 独占创建新目标目录，不覆盖已有机型；先创建 `.import-pending`。
2. 复制图片和清单，写入完成后逐一验证目录、尺寸限制及图片签名。
3. 最后创建 `.import-complete`，此时才允许加载和注册；未完成目录被忽略。
4. 失败时仅尝试清理本次新建目录；清理失败的未完成副本也不会进入机型库。原始素材和已有机型不变。

旧的版本 1 重命名提交目录仍可读取。普通权限错误不会被误判为跨设备错误，也不通过修改权限、关闭加密或调整系统配置来修复。

[Microsoft MoveFileEx 文档](https://learn.microsoft.com/windows/win32/api/winbase/nf-winbase-movefileexa)说明目录移动要求同一磁盘；本次同父目录失败来自本机实测，而不是根据错误文本推断实际跨盘。

## 自动化与构建

| 检查 | 结果 |
| --- | --- |
| `npx tsc -b` | 通过 |
| `npm test` | 35 个测试文件、414 项测试通过 |
| `cargo test --offline --manifest-path src-tauri/Cargo.toml` | 7 项 Rust 测试通过 |
| `npm run build` | 通过；生产构建不启用加速模式或校准实验室 |
| `npm exec --offline -- tauri build --bundles msi` | 通过，Windows x64 MSI 约 58.30 MiB |
| `git diff --check` | 通过 |

Rust 检查使用已安装 MSVC/SDK 的进程内编译环境，没有更改系统环境变量。链接器仍输出既有的 `.dll.lib/.dll.exp` 创建提示，被 Rust 标记为 `linker_messages` warning；无新增编译错误。

Rust 测试覆盖非法路径、缺失/重复/伪装图片、保存和重复保存、复制提交、不完整副本忽略、已提交资源损坏、失败不改源文件。在 `LOCALAPPDATA/com.gundamdoro.importqa/` 下新建独立测试目录，使用实际整机 PNG 与头部 PNG 保存并连续加载两次，逐字节确认资源一致；不读取或覆盖正式 `com.gundamdoro.desktop` 存档。

前端测试覆盖图片签名/解码/关闭位图、字符与字节上限、配件数与顺序、阶段门禁、失败重试、资源先于水合、专注与拼装幂等、暂停恢复、库存与历史保留、OPFS 容量失败/缺失资源及原生适配路由。

## 浏览器实测

使用 Playwright CLI 的独立临时浏览器会话，在 `http://127.0.0.1:1420/?fast=1` 验证，不操作用户浏览器存档。

- 420 × 640 窄窗口内完成填写、上传、排序和移除；空表单不可保存，伪装图片拒绝导入。保存前后进度 JSON 完全一致。
- 上传两个配件，将头部调到躯干之前；保存并刷新后模型仍存在，首次专注显示头部，第二次显示躯干。暂停、刷新、继续保留同一会话与剩余时间。
- 完成两次专注得到两个配件；最后一次回到 READY 等待手动拼装。手动拼装只入库一次，不增加专注次数和分钟数；刷新后成品仍存在。
- 库存可查看两个用户配件，混搭筛选不含该模型，随机搭配不可选这些配件；仓库与详情正常展示导入整机和真实制作记录。
- 在隔离资源库中备份并破坏已提交图片，刷新进入启动重试页，进度 JSON 保持不变；恢复图片后重试成功。BUILD AGAIN 保留机型、永久库存和已完成成品。

浏览器控制台无错误。截图保存在忽略提交的 `output/playwright/`：`model-import-final-form.png`、`model-import-final-complete.png`、`model-import-final-startup-retry.png`。

## 结论与未验证项

第一步的实现、自动化、浏览器流程、真实 Windows 应用目录读写及生产打包检查通过。修复后的桌面窗口点击流程与原生 asset-protocol 图片展示尚未再次实测：本次带独立调试配置的桌面启动命令被执行策略拦截，没有绕过限制；真实目录测试不替代 WebView2 界面验收。

生成的安装包位于 `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi`。桌面冒烟需使用独立测试配置确认“导入 → 刷新/重启 → 图片显示”，避免清除原有应用数据。没有自动安装、Git 提交或推送。

下一开发项为整机图手动圈选分件；用户混搭挂点/比例校准是再下一项，均未在本次实现。
