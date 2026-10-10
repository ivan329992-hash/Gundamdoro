# MECHA-02 original assets

Generated on 2026-10-03 with the built-in imagegen tool; integrated on 2026-10-04. All six project PNGs have genuine alpha transparency and the same native 1086 x 1448 (3:4) canvas. They are original game assets, not official Gundam/Bandai/Sunrise artwork. No image generation runs inside the app.

`final/assembled.png` is the full robot used for selection previews, manual assembly, completion and hangar previews. The five `parts/` sprites are independent detached modules. MECHA-02 currently reuses the default factory break scene; it does not duplicate MECHA-01 part or final images.

## Full-model prompt

Use case: stylized-concept. Asset type: original mecha collectible game sprite, second buildable model MECHA-02. Create one original full-body humanoid industrial robot with a clearly distinct design from a chunky gray utility robot: streamlined ivory ceramic armor over a midnight-blue mechanical chassis, restrained amber sensor lights, rounded split shoulder shells, narrow visor helmet with no horns, layered chest plates, articulated hands, paired sturdy legs and feet. Premium semi-realistic hard-surface game art, crisp panel seams and plausible mechanical joints, soft studio lighting from upper left. Standing neutral relaxed pose with both arms and all limbs fully visible, three-quarter view slightly facing the viewer's right, centered on a portrait 1080x1440 canvas with clear margins. Genuine transparent background with alpha. This robot will be decomposed into torso, head, left arm, right arm and leg unit in subsequent assets, so keep each module readable. No weapons, no props, no floor, no shadow outside the robot, no lettering, no logos, no watermark. Original design only; do not reproduce any existing franchise character.

The built-in tool returned a consistent 1086 x 1448 native canvas for every image. Alpha was preserved without resampling.

## Detached-part prompt set

Shared prefix: Use case: precise-object-edit. Input image 1 is the edit target: the original MECHA-02 full robot. Create one isolated detached collectible game sprite.

Shared suffix: Preserve the exact visible design, panel seams, ivory ceramic armor, midnight-blue chassis, amber accents, materials, lighting and three-quarter camera angle of this particular robot. Add a plausible clean mechanical attachment connector only at the detached joint. Center and enlarge the single requested module within a portrait 1080x1440 canvas, with generous clear margins and no cropping. Genuine transparent background with alpha. No other modules, no ghost robot silhouette, no floor or stand, no external cast shadow, no text, no watermark, no redesign.

| File | Subject inserted between shared prefix and suffix |
| --- | --- |
| `parts/torso.png` | Only the detached central torso: chest armor, central dark-blue abdomen and neck socket. Remove the head, both entire arms including the shoulder shells, pelvis and legs. |
| `parts/head.png` | Only the detached helmet/head with its short neck connector. Keep the narrow amber visor and smooth ivory swept helmet exactly as pictured. No torso, shoulders or limbs. |
| `parts/left-arm.png` | Only the robot's complete anatomical LEFT arm, located on the RIGHT side of the reference image: its shoulder armor, upper arm, elbow, forearm, wrist and articulated hand as one connected module. Remove every other part of the robot. |
| `parts/right-arm.png` | Only the robot's complete anatomical RIGHT arm, located on the LEFT side of the reference image: its shoulder armor, upper arm, elbow, forearm, wrist and articulated hand as one connected module. Remove every other part of the robot. |
| `parts/leg-unit.png` | Only the complete lower-body leg unit, from pelvis through both full legs and both feet, connected together through the pelvis. Remove all torso above the waist, head and arms. |

The outputs were visually inspected before being copied into the project. File assignment was verified from image contents because parallel generation completed out of order. Parts are displayed with `object-fit: contain`; no stage-specific offsets or whole-robot overlays are used.
