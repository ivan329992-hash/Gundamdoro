# MECHA-03 — 重装突击型

Generated with the built-in imagegen tool on 2026-10-04 and 2026-10-05. The full model and derived detached parts are original project artwork. The torso includes its backpack/equipment and excludes pelvis; the leg unit includes pelvis. Shared factory break artwork is reused. Runtime torso asset is `parts/torso.png`; unused variants are kept under `source/` and excluded from the runtime loader. Each selected PNG uses the same 3:4 native canvas and genuine alpha transparency; no per-part rendering offsets are used.

## Full-model prompt

Use case: stylized-concept. Asset type: original collectible mecha game sprite for a focus timer. Render ONE full-body original humanoid robot in premium semi-realistic hard-surface model-kit illustration style, finely detailed mechanical joints and crisp panel seams, restrained surface wear, soft neutral studio light from upper left. Full body and every limb visible. Consistent near-front view with only a slight three-quarter turn toward the viewer's right; neutral balanced standing pose, arms hanging slightly away from torso, feet planted symmetrically. Centered on a portrait 3:4 canvas, target 1080x1440, clear padding on every edge. Genuine alpha-transparent background. Separate readable torso/head/left arm/right arm/paired leg unit; define torso to end above the pelvis and leg unit to include pelvis. Keep the head, hands and feet unobscured by equipment. Original design and silhouette only; do not reproduce a recognizable licensed character. No scene, floor, stand, floating effects, lettering, logos, decals, watermark or external shadow. Subject: A heavily equipped combined-arms assault robot. Substantial blocky shoulder armor, layered chest plates, sturdy legs, a compact twin-thruster backpack with small stabilizer fins, one short cylindrical over-shoulder cannon and a vertically stowed equipment rail along the opposite side of the backpack. Champagne-white ceramic armor, graphite mechanical frame, deep bronze panels, restrained orange sensors. Mounted equipment belongs to torso/backpack, not hand-held props. Broad powerful silhouette with practical industrial detail; helmet is a solid angular visor design without a V-shaped crest.

## Part prompts

Shared prefix: Use case: precise-object-edit. Input image 1 is the edit target: the project's original MECHA-03 full robot. Create one isolated detached collectible game sprite.

Shared suffix: Keep this exact robot's geometry, panel seams, colors, surface finish, proportions, studio lighting and camera angle. Do not redesign or mirror the requested component. Include a plausible clean mechanical connector at the detached joint only. Center and enlarge the single requested module within a portrait 3:4 canvas, target 1080x1440, with generous padding on ALL edges. Fit the entire module inside the canvas without any clipping. Genuine alpha-transparent background. No other modules, no whole-robot ghost layer, no stand, floor, shadow outside the module, text, watermark or logo.

- `parts/torso.png`: Only the central chest and abdomen, with the COMPLETE original backpack, wings, thrusters, fins and any equipment mounted to that backpack retained as ONE torso module. Remove the head, both shoulder armor shells and both entire arms. Remove the pelvis, hip armor and legs. End the abdomen at a clean waist connector above the pelvis.
- `parts/head.png`: Only the complete detached head/helmet with its short neck connector. Remove the torso, backpack, wings, shoulder shells, arms, pelvis and legs.
- `parts/left-arm.png`: Only the complete anatomical LEFT arm of the robot, visible on the RIGHT side of the reference image: include the exact shoulder armor shell, upper arm, elbow, forearm, wrist and full articulated hand as a single connected module. Remove torso, head, backpack, wings, pelvis, legs and opposite arm.
- `parts/right-arm.png`: Only the complete anatomical RIGHT arm of the robot, visible on the LEFT side of the reference image: include the exact shoulder armor shell, upper arm, elbow, forearm, wrist and full articulated hand as a single connected module. Remove torso, head, backpack, wings, pelvis, legs and opposite arm.
- `parts/leg-unit.png`: Only the complete connected lower-body unit: pelvis and hip armor, BOTH full legs and BOTH feet. Start at a clean waist attachment connector. Remove all chest/abdomen above the pelvis, head, shoulders, arms, backpack and wings.

## Source image

`final/assembled.png` was copied from `exec-c4ab2fa4-c54d-4438-8761-4ce9f5516420.png`. Official product reference URLs and design directions are recorded in `docs/design-four-models.md`; no official image was added to the runtime assets.

## Generated part sources

<!-- generated-part-sources -->
- `parts/leg-unit.png`: `exec-b4b13f33-92c6-42d2-be96-89e194082a58.png` (resume prompt in `docs/design-four-models-resume.md`)
- `parts/right-arm.png`: `exec-a7be59ac-981e-4008-ae5a-a4fa2a2a3583.png`
- `parts/left-arm.png`: `exec-a6aff71f-8590-4bdb-84a4-d55e88924200.png`
- `parts/head.png`: `exec-8e6009ef-5646-40b9-8689-6a19afa16b06.png`
- `parts/torso.png`: `exec-4cf0c460-ce07-461e-81d8-1f35c00509ad.png`
