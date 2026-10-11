# 水贴整机 — 头部清理版

日期：2026-10-10。使用内置 imagegen，非官方同人素材，未使用 CLI/API 回退。

用户在侧聊确认后，于同日明确要求替换项目素材库。当前运行文件为 `final/assembled-decals-v2.png`，原 `final/assembled.png` 保留。独立组件未添加水贴。本次导入不涉及专注次数、存档、入库或其他功能变更。

第一轮在旧整机上添加水贴；第二轮清理用户圈出的头部白灰色凸边，并参考 `parts/head-clean-v3.png` 的头部轮廓。最终生成来源：`exec-ea2003fa-9aa0-4f0f-8ae0-7ade0760113d.png`。PNG 为 1086 × 1448，带 Alpha 通道，四角 Alpha 为 `[0,0,1,0]`；背景仍有散点残留。生成编辑不保证非目标区域逐像素一致，细小警示字仍需校对。

## 水贴提示词

Use case: precise-object-edit.
Asset type: transparent full-mecha sprite, waterslide-decal preview variant.
Input image 1 is the EDIT TARGET: the user's existing front-facing Wing Gundam Zero EW angel-wing model sprite. Change ONLY surface printed decals. Preserve the EXACT robot design, face, original blue head side armor, yellow antenna, colors, mechanical geometry, neutral pose, all four feathered wing groups, camera, scale, framing, lighting and material finish. Do not add armor, vents, extra fragments, weapons or accessories.
Primary request: apply tasteful premium model-kit waterslide decals, the restrained technical marking density of a carefully finished MG Ver.Ka display build. Decals must appear printed flush on armor, aligned to each panel's local surface and perspective, with no sticker borders, shine or raised edges. Most of the white armor should remain clean.
Placement: a small charcoal '00' identifier on one white shoulder plate with tiny red caution triangle and short dark service lines on the opposite shoulder; small white technical marks on blue chest plates without covering the green chest sensor or yellow vents; sparse fine charcoal/red maintenance stencils on forearm shells, outer thigh armor, knees and shins; a few thin red panel-end stripes near selected ankle/leg panels. Small understated dark service markings at solid wing ROOT housings only. Keep the long white feather surfaces almost entirely unmarked, with no stripes covering entire wings. Keep face, forehead sensors, V-fin, hands, joints and green chest orb entirely free of decals.
Text: only a few miniature identifiers '00', 'EW', and 'CAUTION' where legible, plus simple technical bars/arrows/triangles. No brand logos, large captions, banners, random oversized numbers or dense gibberish paragraphs. No battle damage, dirt, new weathering, glow or recoloring. The result should feel like the SAME model after a careful physical waterslide-decal finishing pass, not a redesigned robot or an all-over graphic wrap.
Output one PNG with genuine transparent alpha background, same full portrait 1086x1448 canvas, original mecha position/scale, preserve every wing tip and foot. No floor, display stand, shadow outside silhouette, checkerboard, screenshot UI, labels or watermark.

## 头部清理最终提示词

Use case: precise-object-edit.
Input image 1 is the EDIT TARGET: the full-body Wing Gundam Zero EW sprite WITH waterslide decals. Image 2 is the user's RED-BOXED LOCATION REFERENCE ONLY. Image 3 is the approved CLEAN HEAD SHAPE reference only: use its simple blue temple/antenna-root contours, scaled naturally to the existing small head on the full robot, never output a standalone head.
Primary request: remove ONLY the two unwanted white/light-gray raised wedges/lips beside the upper forehead and behind the outer yellow V-fin roots, marked in the red boxes of Image 2. These pointed white-gray rim fragments are not desired. Reconstruct a smooth cobalt-blue temple surface behind the gold antenna at each marked side, with no extra white/gray triangular tabs, rims, islands or raised flakes. Match the clean side contour in Image 3. Retain the narrow central white crown around the forehead sensor and the legitimate white faceplate; do not paint the whole head blue. Keep existing yellow antenna blades, green sensors and eyes, red chin and the original head position/scale. Do not introduce any new horns, plates or mechanical fragments.
Strict invariants: modify only that tiny head-area defect. Preserve the entire rest of Image 1: same torso, shoulders, wings, arms, legs, pose, camera, lighting, colors, panel lines, surface finish and ALL already-applied waterslide decal placement/markings. No changes to shoulder '00' and 'EW', red caution triangles, maintenance marks or leg markings. Do not redesign the face, enlarge the head or zoom the robot. Keep the original full portrait 1086x1448 canvas and transparent alpha background. Every wing tip and both feet remain visible. No screenshot UI, red boxes, labels, watermark, floor, stand or checkerboard. Output exactly one edited full-body decal PNG.
