# MECHA-04 — 羽翼巡航型

Generated with the built-in imagegen tool on 2026-10-04 and 2026-10-05. The full model and derived detached parts are original project artwork. The torso includes its backpack/equipment and excludes pelvis; the leg unit includes pelvis. Shared factory break artwork is reused. Runtime torso asset is `parts/torso-v3.png`; unused variants are kept under `source/` and excluded from the runtime loader. Each selected PNG uses the same 3:4 native canvas and genuine alpha transparency; no per-part rendering offsets are used.

## Full-model prompt

Use case: stylized-concept. Asset type: original collectible mecha game sprite for a focus timer. Render ONE full-body original humanoid robot in premium semi-realistic hard-surface model-kit illustration style, finely detailed mechanical joints and crisp panel seams, restrained surface wear, soft neutral studio light from upper left. Full body and every limb visible. Consistent near-front view with only a slight three-quarter turn toward the viewer's right; neutral balanced standing pose, arms hanging slightly away from torso, feet planted symmetrically. Centered on a portrait 3:4 canvas, target 1080x1440, clear padding on every edge. Genuine alpha-transparent background. Separate readable torso/head/left arm/right arm/paired leg unit; define torso to end above the pelvis and leg unit to include pelvis. Keep the head, hands and feet unobscured by equipment. Original design and silhouette only; do not reproduce a recognizable licensed character. No scene, floor, stand, floating effects, lettering, logos, decals, watermark or external shadow. Subject: An elegant wing-equipped aerial guardian robot. Ice-white and brushed-silver armor over a deep-indigo frame, restrained teal sensors, a smooth narrow-visor helmet without a V crest. Its back has a distinctive pair of large folded-up arcing wings built from overlapping geometric metallic feather-shaped plates, plus two shorter inner stabilizer wings. Fit ALL wing tips inside the portrait canvas; wings curve upward behind the shoulders rather than spreading horizontally. Slender athletic torso and limbs, refined articulated hands and balanced feet. Wings are attached to the back of the torso, do not obscure head or arms. Mechanical wings, not organic feathers; no handheld weapons.

## Part prompts

Shared prefix: Use case: precise-object-edit. Input image 1 is the edit target: the project's original MECHA-04 full robot. Create one isolated detached collectible game sprite.

Shared suffix: Keep this exact robot's geometry, panel seams, colors, surface finish, proportions, studio lighting and camera angle. Do not redesign or mirror the requested component. Include a plausible clean mechanical connector at the detached joint only. Center and enlarge the single requested module within a portrait 3:4 canvas, target 1080x1440, with generous padding on ALL edges. Fit the entire module inside the canvas without any clipping. Genuine alpha-transparent background. No other modules, no whole-robot ghost layer, no stand, floor, shadow outside the module, text, watermark or logo.

- `parts/torso.png`: Only the central chest and abdomen, with the COMPLETE original backpack, wings, thrusters, fins and any equipment mounted to that backpack retained as ONE torso module. Remove the head, both shoulder armor shells and both entire arms. Remove the pelvis, hip armor and legs. End the abdomen at a clean waist connector above the pelvis.
- `parts/head.png`: Only the complete detached head/helmet with its short neck connector. Remove the torso, backpack, wings, shoulder shells, arms, pelvis and legs.
- `parts/left-arm.png`: Only the complete anatomical LEFT arm of the robot, visible on the RIGHT side of the reference image: include the exact shoulder armor shell, upper arm, elbow, forearm, wrist and full articulated hand as a single connected module. Remove torso, head, backpack, wings, pelvis, legs and opposite arm.
- `parts/right-arm.png`: Only the complete anatomical RIGHT arm of the robot, visible on the LEFT side of the reference image: include the exact shoulder armor shell, upper arm, elbow, forearm, wrist and full articulated hand as a single connected module. Remove torso, head, backpack, wings, pelvis, legs and opposite arm.
- `parts/leg-unit.png`: Only the complete connected lower-body unit: pelvis and hip armor, BOTH full legs and BOTH feet. Start at a clean waist attachment connector. Remove all chest/abdomen above the pelvis, head, shoulders, arms, backpack and wings.

## Source image

`final/assembled.png` was copied from `exec-0a2c8baf-370c-4176-a622-c4f49126531a.png`. Official product reference URLs and design directions are recorded in `docs/design-four-models.md`; no official image was added to the runtime assets.

## Generated part sources

<!-- generated-part-sources -->
- `parts/torso-v3.png`: `exec-227b446f-8e56-4309-8c6b-d8cd308e9b4b.png` (waist refinement prompt in `docs/design-four-models-resume.md`)
- `source/torso-v2.png`: `exec-ac7d2974-9d68-4ccb-b40e-3196288d31df.png` (resume prompt in `docs/design-four-models-resume.md`)
- `parts/leg-unit.png`: `exec-253f17f4-b75a-4458-aa1d-a493dc193ae9.png` (resume prompt in `docs/design-four-models-resume.md`)
- `parts/right-arm.png`: `exec-4981b004-b6d2-452b-bf89-e5c8d08aad75.png`
- `parts/left-arm.png`: `exec-94290a90-cbff-432e-88cb-051e02f8ae54.png`
- `parts/head.png`: `exec-032c18de-3bff-4da9-ab57-839438b84376.png`
- `source/torso-initial.png`: `exec-feb3e32d-1e1e-4357-81cb-e54c7dc6c824.png`
