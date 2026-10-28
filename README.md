# Gundamdoro

把专注时间变成可收集的机甲配件。

Gundamdoro 是一款 Windows 桌面番茄钟：每完成一次专注，解锁一个独立配件；集齐当前机型后，由用户点击完成最终拼装。已解锁配件还可以跨机型混搭，命名后保存到机体仓库。

当前版本为 v0.1 MVP 及已批准的扩展，支持浏览器开发预览和本地用户机型导入。运行数据与素材均保存在本地，不需要账号、后端或数据库；暂不提供云同步、移动端或 3D 渲染。

## 功能与使用流程

- **专注计时**：默认专注 25 分钟、休息 5 分钟；支持 15/25/45 分钟快捷选择、自定义时长、暂停/继续和预计结束时间。
- **收集与拼装**：每次完成专注只收集一个配件，非最后一个配件展示后进入休息；集齐后手动拼装，成品自动入库。
- **永久配件与自定义机体**：解锁不消耗、不叠加数量；七个必选身体槽位可跨机型搭配，并可选装已拥有的飞翼零式翅膀。
- **机体仓库与档案**：相同固定机型按一张卡片展示，保留每次完成记录；详情提供机体故事、设计设定和个人累计记录。
- **桌面与存档**：支持桌面迷你计时器、完成提醒、本地存档和重启恢复；可手动导出、恢复包含用户机型图片的完整备份。

主流程：

```text
READY → FOCUS → PART_REWARD
                    ├─ 尚有配件 → BREAK → READY
                    └─ 已集齐   → READY → 点击拼装 → ASSEMBLY → COMPLETE
```

休息结束不会自动开始下一次专注，提前点击“结束休息”也不会影响已收集配件。固定机体最终拼装和自定义保存均不会额外增加专注次数或分钟数。

“取消本次”只停止当前专注、保留本轮收集进度；“放弃制作”确认后清空本轮进度并允许重新选型，但保留永久配件、成品仓库、设置和自定义草稿。“再次制作”开始同机型的新一轮收集，历史成品不受影响。

未完成机型在选择页显示轮廓与问号；完成该固定机型并入库后，才揭示完整预览。拥有配件或保存混搭机体不会提前揭示来源机型。

### 内置机型

| 模型 ID | 名称 / 设计方向 | 新一轮所需专注次数 |
| --- | --- | --- |
| `mecha-01` | MECHA-01 / 通用工程型 | 7 |
| `mecha-02` | MECHA-02 / 轻装机动型 | 7 |
| `mecha-03` | MECHA-03 / 重装突击型 | 7 |
| `mecha-04` | MECHA-04 / 羽翼巡航型 | 7 |
| `mecha-05` | MECHA-05 / 骨架近战型 | 7 |
| `mecha-06` | MECHA-06 / 高速突击型 | 7 |
| `wing-zero-ew` | 飞翼零式 EW / 非官方生成同人素材 | 8 |

七个身体配件按躯干、头部、左臂、右臂、腰胯、左腿、右腿依次收集；飞翼零式第八次收集独立翅膀。次数由模型清单的 `stages.length` 决定，整机图和备用素材不计入。

### 自定义拼装

在 READY 或 COMPLETE 打开“配件仓库与拼装”，切换到“自定义拼装”。选择已拥有的配件，填写名称，再点击底部固定栏中的“保存到成品仓库”；也可以随机搭配。

七个身体槽位必须齐全，背包／翅膀可为空；当前独立可选背包只有 `wing-zero-ew:wings`，未解锁时不能装备。部分机型的紧凑背包或武装仍随躯干移动，不是独立槽位配件。

保存不消耗配件，同一草稿重复保存不会重复入库；修改名称或配方后生成新的草稿身份。自定义卡片只显示成品与摘要，完整配件来源保留在详情中。

名称最多 40 个 Unicode 字符，输入与存档恢复使用相同的计数规则。窄窗口保留紧凑预览和部位选择，可点击“放大预览”查看整机；底部操作栏会按实际高度给页面留出空间。

### 添加自己的机型

从“选择机型”进入“添加我的机型”，填写名称、可选简介，上传整机图与各个独立配件图。可调整配件顺序或移除尚未保存的配件；1–32 个配件对应 1–32 次专注，整机图不占用一次专注。

支持 PNG/JPEG/WebP，独立配件推荐透明背景；单图限制 8 MiB、1600 万像素，整套限制 64 MiB。保存后返回选择页，需手动选择制作；导入本身不会解锁配件或保存成品。

Windows 将素材复制到应用本地数据目录下的 `user-models/`，移动原始图片不会影响导入结果；浏览器预览使用 OPFS 私有文件存储，需要支持该能力的浏览器。素材与机型清单独立保存，进度快照仍使用版本 8，不把大图塞进 localStorage。启动先加载用户机型资源，再恢复进度；资源库读取失败时显示重试，不覆盖存档。

第一步导入的机型仅支持收集与整机展示，不参与跨机型混搭；目前不提供保存后的机型修改、删除或素材包导出。整机图圈选分件、挂点与比例校准属于后续两步。用户导入的个人素材不会自动加入项目源码或上传到 Git。

## 技术栈

| 部分 | 实现 |
| --- | --- |
| 界面与语言 | React 19、TypeScript 5 |
| 开发、构建与测试 | Vite 7、Vitest 5 |
| 业务状态与存档 | Zustand 5、Persist、localStorage |
| 动画与拼装展示 | Framer Motion、PNG 素材、SVG 遮罩与二维变换 |
| Windows 桌面 | Tauri 2、Rust、系统通知插件 |

没有 React Router；主界面由业务阶段和临时视图状态驱动。Rust 只承担桌面集成，计时、收集、仓库与拼装规则主要由 TypeScript 实现。

## 快速运行

### 浏览器开发预览

准备 Node.js 24.x 和 npm；也支持 22.13+ 的 Node.js 22.x。代码检查工具的版本要求高于单独运行 Vite 的最低要求，依赖安装以仓库锁文件为准。

```powershell
git clone https://github.com/ivan329992-hash/Gundamdoro.git
cd Gundamdoro
npm ci
npm run dev
```

打开 [http://localhost:1420/](http://localhost:1420/)。开发服务器支持热更新，修改前端后无需重新安装桌面程序；端口固定为 1420，已被占用时会直接报错。

浏览器可测试计时、收集、仓库与自定义拼装；“迷你计时预览”只是在网页内显示组件，不能悬浮在其他桌面应用之上。网页与 Tauri 的本地存储彼此独立，也没有跨端同步。

### Windows 桌面开发

除前端依赖外，需要 Rust stable 的 MSVC 工具链、Visual C++ Build Tools 的 C++ 桌面开发组件与 Windows SDK，以及 WebView2 Runtime。

```powershell
npx tauri dev
```

Tauri 会自动启动 Vite，不要同时在另一个终端重复运行 `npm run dev` 占用 1420 端口。若 Rust 构建找不到链接器或系统库，检查 C++/SDK 安装，并从 Visual Studio 的 Developer PowerShell 启动。

主窗口默认 480 × 720，最小 420 × 640。启用迷你计时器后，最小化主窗口会显示可拖动、置顶的小窗口；可暂停/继续、隐藏或恢复主窗口，关闭主窗口则退出整个应用。

### 测试与打包

```powershell
npm run lint
npm run format:check
npm test
npm run build
npx tauri build --bundles msi
```

`npm test` 运行逻辑、存档、模块边界、资源及组件回归测试；`npm run build` 先执行 TypeScript 项目检查，再生成 `dist/`。Windows MSI 默认输出到 `src-tauri/target/release/bundle/msi/`；不指定 `--bundles msi` 时按 Tauri 配置构建所有配置的安装包类型。

`npm run lint` 检查源码及测试中的常见错误和未使用变量；`npm run format:check` 检查统一格式，`npm run format` 自动整理 TypeScript、TSX、CSS、测试与根目录配置文件。素材、机型 JSON、Rust 和本地文档不在该格式化命令的范围内。

只检查类型可运行 `npx tsc -b`，范围包含应用、构建配置和浏览器回归测试。构建后的网页可用 `npm run preview` 预览，具体地址以终端输出为准。

### 可重复的浏览器回归

首次安装依赖后下载测试浏览器，再运行回归；不需要提前启动开发服务器：

```powershell
npx playwright install chromium
npm run test:e2e
```

测试自动启动专用的 `127.0.0.1:1430` 服务，使用开发快速模式和独立临时浏览器上下文，在 420 × 640、480 × 720 两种尺寸下运行。覆盖设置弹窗键盘隔离、完整专注/休息/手动拼装、保存失败重试、机型图片上传/刷新恢复、完整备份跨上下文恢复与损坏文件拒绝，以及构建产物不会刷新页面。不会读取日常浏览器或桌面版的存档；端口已占用时直接失败，不接管或关闭现有服务。

`npm test` 仍只运行 Vitest；`tests/e2e/*.e2e.ts` 由 Playwright 单独执行。工作台用例会在其临时上下文准备库存夹具，真实解锁由完整专注循环用例验证；测试不向产品添加解锁后门，也不依赖浏览器内的 store 模块导入。

结果保存在已忽略的 `output/playwright/`：每轮会重建专用的 `test-results/` 和 `report/`，失败时保留截图与 trace；不要把需要长期保留的文件手动放入这两个目录。查看最近报告或单独重跑一个尺寸：

```powershell
npx playwright show-report output/playwright/report
npm run test:e2e -- --project=chromium-420
```

浏览器回归不代替真实 Tauri 最小化、系统通知、休眠唤醒和安装包验收。Linux CI 如缺少浏览器系统库，可在 CI 环境使用 `npx playwright install --with-deps chromium`；不要把它当作日常开发的全局依赖升级命令。

## 开发调试入口

| 地址 | 用途 | 限制 |
| --- | --- | --- |
| `http://localhost:1420/` | 正常分钟制预览 | 使用当前网页的本地存档 |
| `http://localhost:1420/?fast=1` | 计时加速：配置的 1 分钟按 1 秒运行 | 仅开发模式；不会自动解锁配件 |
| `http://localhost:1420/?assembly-lab=1` | 拼装校准实验室 | 独立样例，不读取或写入业务存档 |

快速模式下 15/25/45 分钟实际对应 15/25/45 秒；预计结束时间目前只显示时、分，因此切换时可能仍显示同一分钟，这不代表倒计时没有更新。正常与快速预览共用当前 origin 的存档，建议用独立浏览器配置文件进行加速测试；已开始的计时保留启动时捕获的时长。

校准实验室提供 56 个代表性混搭样例，以及所选两机型的全部 128 种身体组合（分页显示）。支持遮罩、语义线段和关节点编辑，并导出解析后的布局 JSON；导出不会自动替换项目文件，也不会给真实库存发放配件。

两个调试入口在生产构建中均不启用，校准实验室代码不进入生产入口。

## 项目结构

```text
Gundamdoro/
├─ src/
│  ├─ main.tsx                  # 启动、存档恢复与主/迷你/校准入口分流
│  ├─ app/                      # 根界面与依赖装配
│  ├─ components/               # React 展示与交互
│  │  ├─ Mecha/                 # 选型、机型导入、配件展示、奖励、拼装与渲染器
│  │  ├─ Timer/                 # 预计结束时间、迷你计时器与控制界面
│  │  ├─ Inventory/             # 配件仓库与自定义工作台
│  │  ├─ Hangar/                # 成品仓库与机体详情
│  │  ├─ Break/                 # 休息页面
│  │  ├─ Complete/              # 完成页面
│  │  ├─ Settings/              # 设置弹窗、本地备份与恢复
│  │  ├─ Startup/               # 启动重试、运行期保存失败与重试提示
│  │  └─ shared/                # 共用原生模态框
│  ├─ hooks/                    # 计时刷新、提醒/窗口连接、阶段调度、固定栏空间测量
│  ├─ store/                    # Zustand 门面、工厂、动作映射与存档接入
│  ├─ application/              # 用例、端口、快照迁移、计时投影
│  ├─ domain/                   # 纯业务规则、类型、目录与二维变换数学
│  ├─ adapters/
│  │  ├─ platform/              # 时钟、调度、提醒、桌面窗口适配
│  │  ├─ storage/               # 进度、用户机型文件库、备份文件读写与校验
│  │  ├─ catalog/               # 内置 manifest 发现、用户机型目录合并
│  │  └─ assets/                # 素材解析、展示裁切、拼装布局与历史配置
│  ├─ mecha/                    # 模型清单、展示元数据、机体档案设定
│  ├─ assets/mecha/             # 本地 PNG、拼装母图与素材来源说明
│  ├─ dev/                      # 仅开发模式的拼装校准工具
│  ├─ test/                     # 测试替身与辅助数据
│  └─ styles/                   # 基础样式、设计变量和分界面的响应式布局
├─ src-tauri/
│  ├─ src/                      # Rust 桌面启动、生命周期与本地机型文件命令
│  ├─ capabilities/             # 窗口与通知权限
│  ├─ icons/                    # 安装包及应用图标
│  ├─ Cargo.toml / Cargo.lock   # Rust 依赖与锁文件
│  └─ tauri.conf.json           # 窗口、开发地址、打包配置
├─ tests/                       # 模块/开发边界与素材完整性测试
│  └─ e2e/                     # 独立执行的关键浏览器交互回归
├─ public/                      # 网站图标等静态资源
├─ docs/                        # 仅本地文档，不随 Git 分发；入口 docs/README.md
│  ├─ architecture/             # 架构与模块边界
│  ├─ design/                   # 机型设计记录
│  ├─ assets/                   # 素材来源与制作记录
│  └─ qa/                       # 分功能历史验收记录
├─ SPEC.md                      # 需求与已批准变更
├─ AGENTS.md                    # 仓库开发约束
├─ package.json / package-lock.json
├─ vite.config.ts               # React 插件与固定开发端口
├─ playwright.config.ts         # 浏览器回归尺寸、独立服务与报告配置
└─ README.md
```

大部分测试与源码同目录，命名为 `*.test.ts` 或 `*.test.tsx`；根目录的 `tests/` 不是唯一测试入口。`dist/`、`src-tauri/target/`、`output/` 和测试缓存属于生成产物，不提交到 Git。Vite 不监听 Rust 构建/生成目录、测试输出及浏览器诊断目录，避免这些产物触发页面刷新。

### 分层与依赖方向

```text
React components / hooks
          ↓
Zustand store facade
          ↓
application use cases
          ↓
domain rules

app/dependencies.ts → 注入 runtime、storage、catalog、assembly policy
appAssets / appScheduler → 提供素材解析和阶段调度能力
```

业务数据由 Zustand 统一持有；组件只调用动作，不自行发明阶段跳转。应用层协调计时完成、配件解锁、固定机体归档和自定义保存；领域层保持纯业务逻辑，不依赖 React、Zustand、Vite 或浏览器 API。

时钟、UUID、随机数、存储和资源等平台能力通过端口与适配器接入。已有依赖边界测试会检查核心层是否误引入 UI、store、adapters 或平台全局变量；这只是扩展基础，不代表已经实现数据库或联网。

### 阅读代码的入口

| 想了解什么 | 入口文件 |
| --- | --- |
| 启动、水合与恢复失败重试 | [main.tsx](src/main.tsx)、[createAppStore.ts](src/store/createAppStore.ts) |
| 页面分流、按钮和窗口内导航 | [App.tsx](src/app/App.tsx) |
| 状态结构、默认数据与依赖接口 | [types.ts](src/domain/types.ts)、[state.ts](src/application/state.ts)、[ports.ts](src/application/ports.ts) |
| 专注、休息、取消、放弃与固定机体归档 | [useCases.ts](src/application/useCases.ts)、[archiveBuild.ts](src/application/archiveBuild.ts) |
| 配件所有权、自定义草稿与保存 | [inventory.ts](src/domain/inventory.ts)、[workbench.ts](src/application/workbench.ts) |
| 存档校验和旧版本迁移 | [snapshot.ts](src/application/snapshot.ts)、[splitPartsMigration.ts](src/application/splitPartsMigration.ts) |
| 用户机型表单、导入与本地素材 | [ModelImportScreen.tsx](src/components/Mecha/ModelImportScreen.tsx)、[importModel.ts](src/application/importModel.ts)、[userModelFiles.ts](src/adapters/storage/userModelFiles.ts) |
| 完整备份、覆盖恢复与文件校验 | [BackupScreen.tsx](src/components/Settings/BackupScreen.tsx)、[backup.ts](src/application/backup.ts)、[backupFile.ts](src/adapters/storage/backupFile.ts) |
| 拼装策略、关节变换与图层绘制 | [assembly.ts](src/domain/assembly.ts)、[registeredAssembly.ts](src/adapters/assets/registeredAssembly.ts)、[RegisteredMecha.tsx](src/components/Mecha/RegisteredMecha.tsx) |
| 仓库分组与机体故事 | [hangar.ts](src/domain/hangar.ts)、[profiles.ts](src/mecha/profiles.ts) |
| 预计结束、完成提醒和桌面迷你窗口 | [useTimerExperience.ts](src/hooks/useTimerExperience.ts)、[timerExperience.ts](src/application/timerExperience.ts)、[reminders.ts](src/adapters/platform/reminders.ts)、[miniWindow.ts](src/adapters/platform/miniWindow.ts) |

`useAppStore.ts` 是默认状态门面；计时函数与共享类型直接从 `domain/timer.ts`、`domain/types.ts` 引入，不再经过旧转发入口。`mecha/loader.ts` 保留模型与图片查询职责；自定义拼装已正式开放，不再使用恒开启的临时功能开关。

### 计时与窗口协作

计时以 `endAt` 时间戳为准，而不是逐秒递减；刷新或重启后重新计算剩余时间。窗口重新获得焦点、页面恢复或重新可见时会立即校时，不依赖后台定时器准点执行。专注完成按 `sessionId` 幂等处理，同一会话不能重复发放配件；暂停时长不会因时间跨越而继续减少。

主窗口是唯一业务状态与存档写入者。原生迷你窗口只接收计时投影并发送暂停/继续、同步请求，不水合第二份 store，不独立发奖励或提示；关闭整个应用后不会继续发送提醒。

### 拼装与素材配置

固定机体使用模型声明的独立配件和整机图，自定义机体则从各模型单独的正面拼装母图中通过 SVG 多边形遮罩提取模块。统一语义关节和等比变换控制比例：腰胯连接所选躯干，两条腿连接所选腰胯，翅膀位于身体图层后方。

当前新配方记录 `assemblyProfile: standard-front-v4`。身体几何来自 `registered-assembly-v3.json`，背部关节与翅膀来自 `registered-backpack.json`；v1/v2/v3 注册布局继续保留。2026-10-15 按用户确认移除了不带 profile 的旧渲染器及旧布局文件：这类历史配方记录不删除，但显示“旧版装配已停用”。

`presentation.json` 控制固定配件的展示裁切，腰胯与独立腿部复用拼装母图遮罩；不是所有配件都对应一张新 PNG。模块边界见 [工程约束](AGENTS.md#quality-rules)。

## 本地数据与兼容性

存储使用 localStorage，键名为 `gundamdoro-app-state`，当前快照版本为 8。保存字段包括阶段、计时器、当前收集、实际专注分钟、设置、已处理会话、成品记录、当前制作 ID、永久配件和工作台草稿；图片字节不写入存档。

启动顺序为“加载用户机型资源 → 读取与校验进度 → 迁移 → 恢复过期计时 → 渲染正常界面”。支持版本 0–7 迁移，旧版已获得的双腿组件会按模型迁移规则展开为腰胯和两条腿，不凭空增加真实专注统计；历史配方与有效的未知引用保留。

无法读取、解析存档，版本过新或当前活动模型不可用时，显示重试界面而不拿默认值覆盖原存档；启动恢复写入失败也会阻止进入正常界面。先检查存储权限、应用版本与资源，再选择“重新读取存档”，不要直接清除数据。

运行期间写入失败会保留当前窗口内的进度，并显示“进度尚未保存到本机”和重试入口；完成页与拼装页也不会误报保存成功。检查空间或存储权限后点击“重试保存”，成功前请勿关闭或刷新。运行期保存状态不加入版本 8 的十个存档字段，异步存储按顺序写入，避免旧快照覆盖新进度。

网页存档随浏览器、用户配置和站点 origin 隔离，换端口、协议或使用桌面版都不会自动搬迁。可通过下述完整备份手动迁移；清理站点数据前应先导出并确认文件保存成功。

### 备份与恢复

在待机或制作完成页面打开“设置 → 备份与恢复”。“导出完整备份”生成一个 `.gundamdoro` 文件，包含当前进度、永久配件、成品仓库、拼装草稿、设置，以及所有导入的机型和图片；内置素材不重复打包。文件最多 128 MiB、32 个用户机型，单张图片与单套素材仍受导入限制约束。

恢复时先选择文件、查看摘要，再勾选覆盖确认并点击“确认恢复备份”。恢复会替换当前进度、仓库、草稿和设置，**不合并统计**；请先导出当前数据。已有机型素材只补充、不删除，同 ID 的清单与图片完全一致时复用，内容冲突则拒绝恢复。

素材补充失败不会提交进度；进度写入失败也不会替换当前内存进度。已经成功补充的机型素材会保留，解除空间或存储权限问题后可重试。恢复期间请勿关闭或刷新，成功后可返回应用查看。

备份文件做完整性校验但**未加密**，请妥善保存私人记录和图片。首版使用备份容器 v1 和进度 v8，需要兼容的程序及内置素材；只能在应用正常启动后恢复，不能修复阻止启动的机型资源库损坏。备份属于手动本地文件，不提供自动备份或云端同步；系统保存位置由浏览器或桌面系统决定。

## 扩展机型与功能

新增固定机型时，按以下顺序处理：

1. 在 `src/mecha/<model-id>/manifest.json` 声明稳定 ID、连续的 `stages`、配件键和 `finalAsset`；目录会自动发现，但清单仍需通过校验。
2. 在 `src/assets/mecha/<model-id>/` 添加本地素材和来源说明；可提供 `presentation.json` 以及机型自己的 `break/break-01.png`，否则使用默认休息场景。
3. 如需机体详情，在 `src/mecha/profiles.ts` 补充档案；**新增清单不等于自动支持混搭**，自定义拼装还需母图、遮罩、挂点和兼容策略注册。
4. 涉及已发布模型时保留原有模型/配件 ID、历史资源和配方布局，明确收集顺序变化与存档迁移规则。
5. 添加目录、配件数、收集、存档、素材和渲染测试，再跑类型检查、前端构建及相关 Windows 验证。

新业务规则放在 `domain/`，跨模块用例放在 `application/`，UI 放在 `components/`；平台或持久化实现放在 `adapters/` 并在组装根注入。不要在 UI 里散落业务规则，也不要让核心层直接访问 localStorage 或桌面 API。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [SPEC.md](SPEC.md) / [AGENTS.md](AGENTS.md) | 需求、已批准变更与工程约束；早期五组件和禁止导入描述以第 26、31–35 节为准 |
| [拼装素材来源](src/assets/mecha/ASSEMBLY_SOURCES.md) | 母图来源与非官方素材边界，不含完整制作提示词 |

详细架构、机型设计、制作提示词和历史验收记录仅保存在本地 `docs/`，入口为 `docs/README.md`；该目录已加入忽略规则，不随 Git 分发，也不是运行或构建的依赖。新克隆的项目不会包含这些文件，需要自行备份和恢复。历史验收记录中的组件数、版本和测试数量不应当作当前版本配置。

取消跟踪不会清除已提交的历史文档；远端最新版中的移除也需要后续提交并推送后才生效。

## 素材来源与许可证

仓库包含六套原创生成机型，以及用户明确要求纳入的“飞翼零式 EW”生成同人素材。内置素材在构建时本地打包，用户导入素材存入本地资源库；不下载官方图片，也不依赖远程字体或 CDN。

项目附带 [Apache License 2.0](LICENSE)。代码许可证不代表获得飞翼零式角色、名称或同人图的商业使用授权；非官方来源及边界见 [飞翼零式素材说明](src/assets/mecha/wing-zero-ew/ASSETS.md) 和 [拼装素材来源](src/assets/mecha/ASSEMBLY_SOURCES.md)，应保留这些说明。

机体详情中的能力指数与背景故事属于应用内设定；飞翼零式相关内容明确为非官方解读，不是官方参数或授权设定。

## 已知边界

系统通知默认关闭，需要用户开启并授予权限；实际提醒还受操作系统通知设置和勿扰模式影响。权限不可用或发送失败时会提示错误，不回滚已经获得的配件，也不会在专注完成时自动申请权限；后续发送成功会清除旧通知错误。提示音依赖交互解锁，整个应用关闭或系统休眠期间不保证提醒投递，原生发送命令成功也不等于系统一定展示通知。

自定义拼装是二维静态模块组合，不是 3D 或骨骼动画；部分生成素材边缘仍可能有细小残留，正式宣传图需额外检查。联网、多设备同步、移动端和更多独立装备类型仍需另行设计与开发。
