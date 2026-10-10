# Detached collectible parts

The five sprites in `parts/` were generated with the built-in imagegen edit tool from the project's original `stages/stage-06.png` on 2026-10-02. Each final sprite is a local transparent 1080 x 1440 PNG. The full-mecha image is used only for manual assembly and completion. Earlier half-assembled stage images are retained as source history and are no longer selected by the runtime loader.

## Prompt set

Shared prompt: `Use case: precise-object-edit. Image 1 is the edit target: an original MECHA-01 robot. Create a detached collectible game sprite. Keep the exact design, surface panels, charcoal and warm gray armor, teal indicators, coral accents, studio lighting, and camera angle of the pictured part. Render this single detached module by itself in the center of a transparent portrait 1080x1440 canvas. Fit the part comfortably with generous empty margins; no cropping. Show a clean mechanical connector where detached. No other components, no ghost robot, no display stand, no background, no cast shadow, no lettering, no logo, no UI, no watermark. Output genuine alpha transparency. This sprite is shown in a separate inventory slot; do not show an assembled robot.`

- `torso.png`: only the central chest armor, abdomen and pelvis/waist connector; remove head, both shoulders and arms, both legs and feet.
- `head.png`: only the angular head including its short neck connector; remove torso, shoulders, arms, waist and legs.
- `left-arm.png`: only the robot's left arm (viewer right), including shoulder, upper arm, elbow, forearm and hand; remove all other parts.
- `right-arm.png`: only the robot's right arm (viewer left), including shoulder, upper arm, elbow, forearm and hand; remove all other parts.
- `leg-unit.png`: only the two complete legs and feet as one detached paired module, starting at hip connectors; remove head, torso, waist armor, shoulders, arms and hands.

The PNGs are normalized to the target canvas with alpha-preserving resizing. They occupy separate collection slots, so no per-part alignment offsets are used to layer whole robot images.
