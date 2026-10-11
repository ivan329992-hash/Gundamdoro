# 天线与头盔碎片清理

日期：2026-10-10。使用内置 imagegen，未使用 CLI/API 回退或本地像素编辑。

- 初始编辑目标：`parts/head-blue-v2.png`；位置参考：用户红框标注的头部截图，仅作为位置说明，不加入输出。
- 第一轮：`exec-37dd1323-cdef-4777-b1cc-57e2df69eb09.png`，去除侧边碎片后仍有额头两侧灰色凸起，未接入程序。
- 第二轮以第一轮结果为编辑目标，继续去除额头两侧灰色凸起；选用 `exec-767dc03e-0286-4022-8ae6-17ad34a0107e.png`。
- 最终运行文件：`parts/head-clean-v3.png`；保留旧版，整机图不变。生成发生重新取景，使用对应的源视窗数据展示，计时和存档不变。

## 第一轮提示词

Use case: precise-object-edit.
Asset type: transparent standalone Wing Gundam Zero EW head sprite for an existing app.
Input images: Image 1 is the EDIT TARGET, the clean blue-sided detached head PNG. Image 2 is the user's ANNOTATED LOCATION REFERENCE ONLY: red boxes mark unwanted white/gray protruding fragments behind and around the yellow forehead antenna. Never include the screenshot UI, red boxes, background, or annotations in the output.
Primary request: REMOVE the unwanted white/light-gray tabs, triangular wedges, raised lips and extra plates in ALL five boxed areas. These are at the left temple behind the outer yellow antenna, just above that left antenna root, the upper-right edge of the crown beside the inner yellow spike, the right inner antenna root, and the right temple beside the outer yellow antenna. Do not merely recolor these extra pieces: simplify their shapes into clean helmet surfaces with correct occlusion, no jagged extraneous protrusions. Replace the marked white-gray temple wedges with uninterrupted cobalt-blue side armor; remove small upright white-gray scraps next to the yellow antenna roots. Where a removed piece protrudes beyond the helmet/antenna silhouette, make that area genuinely transparent. Keep the normal central white crown as one simple continuous cap, the white faceplate/cheek guards below the eyes, green eyes and forehead sensors, red chin, dark neck and the existing yellow V-fin antenna beams. Do not remove or recolor legitimate white faceplate/crown or the gold antenna. Antenna arms should read as clean continuous gold blades attached at the central yellow/green forehead mount, without white-gray islands wedged through their roots.
Invariants: same front-facing identity, original face shape, blue side panels, material finish, light direction, scale and position. Keep full portrait 1086x1448 canvas, head approximately x448..682 y188..372, rest blank alpha-transparent; do not enlarge, recenter, rotate, add shoulders or restyle the whole head. One edited head only. No text, watermark, added horns, new mechanical greebles, boxes, checkerboard or painted backdrop. The goal is a visibly cleaner head with the specifically marked white/gray junk removed.

## 第二轮最终提示词

Use case: precise-object-edit, second targeted cleanup.
Image 1 is the edit target: the blue-sided Wing Zero EW isolated head from the previous cleanup. Image 2 is the original user's red-box location reference ONLY, not an output image.
The remaining defect is the gray/white ROOF-LIKE SHOULDER/WEDGE on EACH side of the upper helmet, behind the gold antenna. REMOVE both of these flared gray wedges and all tiny gray tabs beside the antenna spikes. The white crown must be a NARROW central cap around the upper green sensor, ending just to either side of that central sensor, NOT a wide gray roof stretching left/right behind the antenna. Between each inner upright gold spike and outer diagonal gold blade there must be no white/gray triangular flap: show empty alpha background above the blue temple silhouette and/or uninterrupted cobalt-blue helmet surface below it. Do not leave a gray island, lip, tooth or extra panel along the gold fin edges. Remove any remaining white temple patches marked in the original annotation. Keep a clean solid blue temple on both sides and a simple central white forehead, with the gold blades clearly in front.
Preserve the existing face, white faceplate and cheeks, green eyes and sensors, red chin, dark neck, blue side panels, four gold antenna blades and central gold/green forehead mount. No new structures; no text/red boxes/watermarks. Same front-facing pose, same lighting and model-kit finish. Genuine transparent alpha background. Keep portrait canvas 1086x1448 and the head in its current position and scale; do not output a UI screenshot or whole robot. Output one clean transparent head sprite with those gray/white extraneous upper side pieces gone.
