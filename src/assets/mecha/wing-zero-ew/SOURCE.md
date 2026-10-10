# 飞翼零式 EW 非官方同人素材包

日期：2026-10-09。生成方式：内置 imagegen。

## 交付内容

- `full-body.png`：正面 A 姿态整机基准图。
- `head.png`、`torso.png`、`wings.png`：头部、躯干、四翼背包独立组件。
- `left-arm.png`、`right-arm.png`、`leg-unit.png`：左右手臂及含骨盆的双腿组件。左右以机体自身为准，因此左臂位于观者右侧。
- `assets.json`：尺寸、组件清单、有效区域和建议装配矩形；`preview.html`：可离线打开的整机与组件画廊。
- `PART_PROMPTS.md`、`SOURCE_FILES.md`：拆分提示词和生成文件来源；`source/`：保留的整机初稿和右臂初稿，不作为正式素材。

## 校验与接入说明

7 张正式 PNG 均为 1086 × 1448，3:4 画布，实际透明通道可正常解码，四角透明。全图和六组件已进行视觉检查；右臂中多余的翅膀残片已移除，翅膀背包独立存在。

AI 拆分未能完全保持每个模块的原始尺度。`sourceBounds` 为按 alpha>64、每 6 像素采样并加边距得到的可见区域，适合用于组件缩略图；`placementHint` 是未进行像素级配准验收的初稿建议值，正式拼装需校准。不要将提示词中的位置约束误认为已经验证的几何保证。左右臂拆成两张图片，因此总共六个组件；这不决定番茄钟的解锁次数。

素材只保存在独立目录，没有接入或改动主项目的源代码、计时逻辑、仓库状态或配置。本目录 `assets.json` 是素材交接清单，不是主程序可直接导入的机型 manifest。

## 角色与来源

这是 AI 生成的非官方同人图，不是万代官方素材或授权商品。角色名称与原设计的权利属于相应权利人；本包不代表获得角色使用授权。

官方造型参考：https://www.bandaispirits.co.jp/products/search/detail.php?grp_id=5325&prd_id=4573102607607000

## 整机生成提示词

Use case: stylized-concept. Asset type: unofficial fan-art modular PNG sprite master for a Gundam Pomodoro app. Subject: WING GUNDAM ZERO EW from Gundam Wing Endless Waltz, faithful to the recognizable MG Ver.Ka character design: iconic four WHITE feather-like wings (two large outer wing assemblies and two smaller inner wing assemblies), white angular armor, cobalt-blue chest sections, red torso/waist accents, red chin and toe armor, yellow V-fin and yellow chest vents, green eyes and forehead sensor, articulated dark-gray inner frame. This is that named fictional mecha, not an original generic angel robot. Render one full robot in a strictly front-facing orthographic NEUTRAL A-POSE: upright symmetrical torso, head looking straight ahead, arms slightly away from sides with relaxed empty hands, legs parallel in a balanced stance. Wings moderately open upward/diagonally behind the body with every feather tip visible and generous margins. No weapons, rifles, sabers, shields, effects, loose feathers or action pose. Premium clean model-kit style game illustration, crisp mechanical details and restrained panel lines, soft neutral studio lighting from upper left, smooth white armor, not battle-damaged. Separate readable modules: head, torso ending above pelvis, wing/backpack unit, left arm, right arm, and pelvis with both legs. Portrait 3:4 canvas, target 1080x1440. Fit the entire robot and wings within the canvas with 8% clear padding on all sides. Genuine transparent alpha background, no checkerboard pattern, no floor, stand, shadow outside the robot, words, caution decals, logos or watermark.

## 背景与留白精修提示词

Use case: background-extraction and precise-object-edit. Image 1 is the edit target: this specific front-facing Wing Gundam Zero EW sprite. Keep the SAME exact recognizable robot identity, colors, body geometry, four white feather-wing assemblies, neutral pose, camera angle and studio lighting. Produce a clean game-ready alpha cutout. Remove all white/gray speckled fog, detached pixels, floating debris and background remnants between and around wings and legs. Empty space must be genuinely transparent, not painted black or a checkerboard. Preserve crisp feather edges and all small mechanical details inside the silhouette. Reframe the complete robot slightly SMALLER and centered on the same portrait 3:4 canvas so every outer feather tip, V-fin and foot has at least 7% clear transparent margin from all canvas edges; no cropped tips. Do not add loose feathers, effects, weapons, text, logos or a stand. Do not change the character design.

## 右臂独立性精修提示词

Use case: precise-object-edit. Image 1 is the edit target: a detached Wing Gundam Zero EW RIGHT arm sprite with an unwanted white feather-wing fragment ABOVE and BEHIND its shoulder. Remove the ENTIRE feather-wing fragment and its dark wing-root hinge. Keep ONLY the original arm from its blue/yellow/white shoulder armor shell downward through upper arm, elbow, forearm, wrist and hand. The shoulder shell is the blue-and-yellow panel with a circular blue shoulder disc; keep that shell, but absolutely no feather-like wing plate or wing hinge above it. Preserve the exact remaining arm pose, pixel position, scale, camera, colors, surfaces and silhouette on the SAME full original 3:4 canvas. Do not recenter or enlarge it. Removed regions become genuine alpha transparency. No other body parts, ghost wing, spare fragments, shadow, logo or lettering.
