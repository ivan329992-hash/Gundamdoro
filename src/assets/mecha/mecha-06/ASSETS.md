# MECHA-06 — 高速突击型

Generated with the built-in imagegen tool on 2026-10-04 and 2026-10-05. The full model and derived detached parts are original project artwork. The torso includes its backpack/equipment and excludes pelvis; the leg unit includes pelvis. Shared factory break artwork is reused. Runtime torso asset is `parts/torso.png`; unused variants are kept under `source/` and excluded from the runtime loader. Each selected PNG uses the same 3:4 native canvas and genuine alpha transparency; no per-part rendering offsets are used.

## Full-model prompt

Use case: stylized-concept. Asset type: original collectible mecha game sprite for a focus timer. Render ONE full-body original humanoid robot in premium semi-realistic hard-surface model-kit illustration style, finely detailed mechanical joints and crisp panel seams, restrained surface wear, soft neutral studio light from upper left. Full body and every limb visible. Consistent near-front view with only a slight three-quarter turn toward the viewer's right; neutral balanced standing pose, arms hanging slightly away from torso, feet planted symmetrically. Centered on a portrait 3:4 canvas, target 1080x1440, clear padding on every edge. Genuine alpha-transparent background. Separate readable torso/head/left arm/right arm/paired leg unit; define torso to end above the pelvis and leg unit to include pelvis. Keep the head, hands and feet unobscured by equipment. Original design and silhouette only; do not reproduce a recognizable licensed character. No scene, floor, stand, floating effects, lettering, logos, decals, watermark or external shadow. Subject: A high-mobility interceptor robot combining exposed mechanical joints with compact aero armor. Deep-cobalt and gunmetal armor with pale-silver edge panels and restrained orange sensor lights. A compact twin-jet backpack with FOUR short swept aerodynamic blade fins folded close to the spine, streamlined chest plates, slender waist frame, curved shoulder caps, reinforced forearms and narrow armored shins. Original streamlined enclosed helmet with a single vertical/slanted visor aperture, no V crest. Athletic symmetrical stance, all hand and foot joints visible. Distinct from a feather-wing guardian and heavy cannon platform; no handheld weapons or oversized equipment.

## Part prompts

Shared prefix: Use case: precise-object-edit. Input image 1 is the edit target: the project's original MECHA-06 full robot. Create one isolated detached collectible game sprite.

Shared suffix: Keep this exact robot's geometry, panel seams, colors, surface finish, proportions, studio lighting and camera angle. Do not redesign or mirror the requested component. Include a plausible clean mechanical connector at the detached joint only. Center and enlarge the single requested module within a portrait 3:4 canvas, target 1080x1440, with generous padding on ALL edges. Fit the entire module inside the canvas without any clipping. Genuine alpha-transparent background. No other modules, no whole-robot ghost layer, no stand, floor, shadow outside the module, text, watermark or logo.

- `parts/torso.png`: Only the central chest and abdomen, with the COMPLETE original backpack, wings, thrusters, fins and any equipment mounted to that backpack retained as ONE torso module. Remove the head, both shoulder armor shells and both entire arms. Remove the pelvis, hip armor and legs. End the abdomen at a clean waist connector above the pelvis.
- `parts/head.png`: Only the complete detached head/helmet with its short neck connector. Remove the torso, backpack, wings, shoulder shells, arms, pelvis and legs.
- `parts/left-arm.png`: Only the complete anatomical LEFT arm of the robot, visible on the RIGHT side of the reference image: include the exact shoulder armor shell, upper arm, elbow, forearm, wrist and full articulated hand as a single connected module. Remove torso, head, backpack, wings, pelvis, legs and opposite arm.
- `parts/right-arm.png`: Only the complete anatomical RIGHT arm of the robot, visible on the LEFT side of the reference image: include the exact shoulder armor shell, upper arm, elbow, forearm, wrist and full articulated hand as a single connected module. Remove torso, head, backpack, wings, pelvis, legs and opposite arm.
- `parts/leg-unit.png`: Only the complete connected lower-body unit: pelvis and hip armor, BOTH full legs and BOTH feet. Start at a clean waist attachment connector. Remove all chest/abdomen above the pelvis, head, shoulders, arms, backpack and wings.

## Source image

`final/assembled.png` was copied from `exec-64572731-f605-4778-9989-9ff48a156174.png`. Official product pages informed design directions only; no official image was added to the runtime assets. Detailed design references and prompts are local-only and are not distributed with this repository.

## Generated part sources

<!-- generated-part-sources -->
- `parts/leg-unit.png`: `exec-7cc611d2-3587-4064-9269-bffb464e3fd6.png` (local-only refinement prompt)
- `parts/right-arm.png`: `exec-e4b0eb6b-4bb6-4b72-8e97-d4e6bfbf1a9a.png` (local-only refinement prompt)
- `parts/left-arm.png`: `exec-ff2d4718-2a68-4da6-87d0-bf47a5b26520.png` (local-only refinement prompt)
- `parts/head.png`: `exec-30a5b34d-542c-4c8f-ae43-19d2730de40d.png`
- `parts/torso.png`: `exec-a94bd444-7b65-43ab-9727-b4d0a1ab44d6.png`
