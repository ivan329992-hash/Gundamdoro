# 头部蓝色侧甲恢复

日期：2026-10-10。使用内置 imagegen 精确对象编辑模式，无 CLI/API 回退。

- 编辑目标：`parts/head-corrected.png`；配色/机体参考：`final/assembled.png`。
- 运行输出：`parts/head-blue-v2.png`，1086 × 1448 RGBA PNG；原头部保留。
- 原始生成输出：`exec-705ba6f4-da1b-4c25-8313-b3405e1232cf.png`。
- 恢复两侧蓝色侧甲，保留白色头盔/面罩、黄色天线、绿色传感器、红色下巴和透明背景。生成有轻微位置差异，使用机型视窗数据重新留边；不声称逐像素只改变颜色。
- 原整机图本来具有蓝色头部侧甲，保持不变；计时、解锁次数、存档与入库逻辑未改。

## 最终提示词

Use case: precise-object-edit.
Asset type: transparent detached head sprite for the existing Gundamdoro app.
Input images: Image 1 is the EDIT TARGET, the existing isolated Wing Gundam Zero EW head with wrongly whitened lateral panels. Image 2 is COLOR/IDENTITY REFERENCE ONLY, the existing full-body mecha; do not output a whole robot.
Primary request: restore ONLY the two lateral helmet/ear vent armor panels to the distinctive saturated cobalt/royal BLUE of Wing Gundam Zero EW (MG Ver.Ka), matching the blue sides of the head in Image 2. The panels flank the eyes/temples and extend beside the cheeks; they must no longer be white/light gray. Preserve the WHITE crown/central helmet, WHITE faceplate and narrow white face borders; do not paint the whole helmet blue. Keep the yellow V-fin and forehead trim, green sensors/eyes, red chin, dark gray recesses and neck exactly as they are. This is a color-correction edit, not a redesign.
Composition/framing invariants: keep the SAME original portrait canvas, exactly 1086x1448, same front-facing pose, original head position and scale (visible head approximately x426..655,y168..370). Do not zoom, enlarge, recenter, rotate or add anything. All blank pixels remain genuine alpha transparency. Match the original mechanical edges, seams, highlights and lighting. No torso, wings, shoulders, labels, logos, watermark, checkerboard or painted background. Output exactly one transparent head PNG.
