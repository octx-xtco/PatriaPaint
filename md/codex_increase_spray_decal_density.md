# Codex Task — Slightly Increase Spray Decal Density

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

The 3D bust model was replaced with a lower-polygon version, and performance is now better.

Now improve the spray paint feel by increasing decal density slightly so strokes look more fluid and connected.

Do not rewrite the app. Adjust the existing Babylon.js spray system.

## Goal

Make the spray feel more fluid and continuous, while keeping performance acceptable.

The current spray works, but it should have:

- slightly denser decal placement
- smoother connected strokes
- fewer visible gaps
- a more natural spray trail

Do not overdo it. We do NOT want to go back to the previous slow behavior.

## Constraints

- Keep Babylon.js.
- Keep painting on the actual 3D bust surface.
- Keep Spray Mode behavior as it currently works.
- Do not switch to a 2D overlay.
- Do not create new materials or textures per decal.
- Keep cached materials/textures.
- Keep decal count capped.
- Keep Clear Graffiti working.

## Adjust the spray tuning

Increase density only moderately.

Use values approximately in this range:

```js
const MAX_DECALS = 450;
const MIN_SPRAY_INTERVAL_MS = 18;
const SPRAY_SPACING_MULTIPLIER = 0.5;
const SPRAY_BURST_COUNT = 1;
const MAX_INTERPOLATION_STEPS = 5;
const MIN_SPRAY_DISTANCE = spraySize * 0.3;
```

If the current code uses slightly different constant names, adapt accordingly.

## Interpolation

Keep interpolation between the previous hit point and the current hit point.

The line should feel more continuous than before, but do not allow too many interpolated decals.

Use capped interpolation:

```js
const spacing = spraySize * SPRAY_SPACING_MULTIPLIER;

const steps = Math.min(
  MAX_INTERPOLATION_STEPS,
  Math.max(1, Math.ceil(distance / spacing))
);
```

This should create a smoother line without exploding the decal count.

## Visual quality

Keep the spray visually soft and natural:

- slight random size variation
- slight random rotation
- slight random opacity variation only if it does not require creating new materials
- keep the noisy spray texture
- no giant repeated circles

The stroke should feel denser, not heavier.

## Performance protection

Even though the model is lighter now, keep performance protections:

- reuse cached materials/textures
- keep debug logs off during painting
- dispose oldest decals when `MAX_DECALS` is exceeded
- do not rebuild `paintableMeshes`
- do not create new textures inside pointermove
- do not create new materials inside pointermove
- do not scan all scene meshes while painting

## Final verification

Run the app and verify:

1. Spray Mode still works.
2. Strokes look more fluid and connected.
3. The spray has slightly more density.
4. Performance remains acceptable.
5. Clear Graffiti still works.
6. Camera/model interaction still restores when Spray Mode is off.
7. No console errors.

## Priority

Increase decal density only a little.

The goal is:

- smoother spray
- slightly more fluid strokes
- still fast enough to use comfortably
