# MECHA-05 — 骨架近战型

Generated with the built-in imagegen tool on 2026-10-04 and 2026-10-05. The full model and derived detached parts are original project artwork. The torso includes its backpack/equipment and excludes pelvis; the leg unit includes pelvis. Shared factory break artwork is reused. Runtime torso asset is `parts/torso-v2.png`; unused variants are kept under `source/` and excluded from the runtime loader. Each selected PNG uses the same 3:4 native canvas and genuine alpha transparency; no per-part rendering offsets are used.

## Full-model prompt

Use case: stylized-concept. Asset type: original collectible mecha game sprite for a focus timer. Render ONE full-body original humanoid robot in premium semi-realistic hard-surface model-kit illustration style, finely detailed mechanical joints and crisp panel seams, restrained surface wear, soft neutral studio light from upper left. Full body and every limb visible. Consistent near-front view with only a slight three-quarter turn toward the viewer's right; neutral balanced standing pose, arms hanging slightly away from torso, feet planted symmetrically. Centered on a portrait 3:4 canvas, target 1080x1440, clear padding on every edge. Genuine alpha-transparent background. Separate readable torso/head/left arm/right arm/paired leg unit; define torso to end above the pelvis and leg unit to include pelvis. Keep the head, hands and feet unobscured by equipment. Original design and silhouette only; do not reproduce a recognizable licensed character. No scene, floor, stand, floating effects, lettering, logos, decals, watermark or external shadow. Subject: A powerful wolf-like close-combat humanoid robot with clearly exposed pistons and tendons at the narrow abdomen, elbows and knees. Bone-white segmented armor, charcoal/titanium structural frame, deep-crimson shoulder and forearm accents, restrained amber sensors. Thick plated forearms, large but anatomically plausible articulated mechanical hands, muscular thighs and strong digit-like feet; no held weapons. Helmet has a low angular jaw and small swept-back side fins, NOT a horned V-shaped crest or familiar franchise mask. Dynamic predatory proportions expressed in a neutral standing pose. No tail or accessory extending outside the silhouette.

## Part prompts

Shared prefix: Use case: precise-object-edit. Input image 1 is the edit target: the project's original MECHA-05 full robot. Create one isolated detached collectible game sprite.

Shared suffix: Keep this exact robot's geometry, panel seams, colors, surface finish, proportions, studio lighting and camera angle. Do not redesign or mirror the requested component. Include a plausible clean mechanical connector at the detached joint only. Center and enlarge the single requested module within a portrait 3:4 canvas, target 1080x1440, with generous padding on ALL edges. Fit the entire module inside the canvas without any clipping. Genuine alpha-transparent background. No other modules, no whole-robot ghost layer, no stand, floor, shadow outside the module, text, watermark or logo.

- `parts/torso.png`: Only the central chest and abdomen, with the COMPLETE original backpack, wings, thrusters, fins and any equipment mounted to that backpack retained as ONE torso module. Remove the head, both shoulder armor shells and both entire arms. Remove the pelvis, hip armor and legs. End the abdomen at a clean waist connector above the pelvis.
- `parts/head.png`: Only the complete detached head/helmet with its short neck connector. Remove the torso, backpack, wings, shoulder shells, arms, pelvis and legs.
- `parts/left-arm.png`: Only the complete anatomical LEFT arm of the robot, visible on the RIGHT side of the reference image: include the exact shoulder armor shell, upper arm, elbow, forearm, wrist and full articulated hand as a single connected module. Remove torso, head, backpack, wings, pelvis, legs and opposite arm.
- `parts/right-arm.png`: Only the complete anatomical RIGHT arm of the robot, visible on the LEFT side of the reference image: include the exact shoulder armor shell, upper arm, elbow, forearm, wrist and full articulated hand as a single connected module. Remove torso, head, backpack, wings, pelvis, legs and opposite arm.
- `parts/leg-unit.png`: Only the complete connected lower-body unit: pelvis and hip armor, BOTH full legs and BOTH feet. Start at a clean waist attachment connector. Remove all chest/abdomen above the pelvis, head, shoulders, arms, backpack and wings.

## Source image

`final/assembled.png` was copied from `exec-fbdc0c3f-aede-4c16-81f8-18c7c67f4d4b.png`. Official product pages informed design directions only; no official image was added to the runtime assets. Detailed design references and prompts are local-only and are not distributed with this repository.

## Generated part sources

<!-- generated-part-sources -->
- `parts/torso-v2.png`: `exec-a97f1c6e-ae0b-4075-90ee-892114718a26.png` (local-only refinement prompt)
- `parts/leg-unit.png`: `exec-7b1e0e58-6899-4c02-ac42-385f2baab68f.png` (local-only refinement prompt)
- `parts/right-arm.png`: `exec-0c8d0a4c-65df-46cb-b4aa-8b05ffcc5b28.png` (local-only refinement prompt)
- `parts/left-arm.png`: `exec-ff0b238f-c05d-4082-b8fa-968a06e77eff.png` (local-only refinement prompt)
- `parts/head.png`: `exec-d95c986f-a465-469c-877e-1fe0b8785125.png`
- `source/torso-initial.png`: `exec-ee6dd82c-7079-4e25-9e78-a305ab729262.png`
