# Codex Task — Optimize Spray Paint Performance

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

Optimize the spray paint feature performance in the existing “Artigas Canta” Babylon.js app.

The spray now works, but the app becomes very slow while painting. The likely cause is that too many Babylon decals / meshes are being created, especially after adding interpolation for continuous spray.

Do not rewrite the app. Optimize the existing spray system.

## Goals

- keep spray painting visually continuous
- keep the app responsive
- reduce decal count
- reuse materials/textures
- avoid console spam
- preserve Spray Mode behavior
- keep camera/model interaction working when Spray Mode is off
- keep Clear Graffiti working

Inspect the current graffiti/spray implementation and fix performance.

## Required changes

### 1. Do not create new materials or textures for every decal

Do not generate a new material, canvas, DynamicTexture, or procedural spray texture for every paint mark.

Instead:

- create one cached material per spray color
- reuse that material for all decals of the same color
- cache procedural spray textures
- do not generate canvas textures inside every pointer event
- create texture/material variants only when the selected color or opacity changes

Suggested approach:

```js
const materialCache = new Map();

function getSprayMaterial(color, opacity) {
  const key = `${color}_${opacity}`;

  if (materialCache.has(key)) {
    return materialCache.get(key);
  }

  const material = createSprayMaterial(color, opacity);
  materialCache.set(key, material);
  return material;
}
```

### 2. Reduce decal density

Tune constants to something more reasonable:

```js
const MAX_DECALS = 450;
const MIN_SPRAY_INTERVAL_MS = 24;
const SPRAY_SPACING_MULTIPLIER = 0.65;
const SPRAY_BURST_COUNT = 1;
```

Adjust if needed, but prioritize performance over excessive density.

The current implementation is probably creating too many decals per second.

### 3. Keep interpolation, but limit it

Interpolation is needed for continuous strokes, but it should be capped.

If interpolation is currently creating many decals per pointer move, limit it.

Use something like:

```js
const MAX_INTERPOLATION_STEPS = 6;

const steps = Math.min(
  MAX_INTERPOLATION_STEPS,
  Math.max(1, Math.ceil(distance / spacing))
);
```

Do not allow one fast mouse move to create dozens of decals.

### 4. Avoid creating decals when pointer barely moved

Use a minimum distance threshold so tiny cursor movements do not create new decals.

Example:

```js
const MIN_SPRAY_DISTANCE = spraySize * 0.45;
```

If the pointer barely moved and the last spray time was recent, skip decal creation.

### 5. Remove console spam during active spraying

Move all graffiti debug logs behind a flag:

```js
const DEBUG_GRAFFITI = false;
```

Do not log every:

- pointermove
- pick result
- decal creation
- interpolation step
- spray tick

It is okay to keep occasional logs when:

- spray mode toggles
- paintable meshes are initialized
- clear graffiti runs
- debug mode is enabled

### 6. Dispose old decals aggressively

If decal count exceeds `MAX_DECALS`, dispose the oldest decal immediately.

Example:

```js
while (sprayDecals.length > MAX_DECALS) {
  const oldDecal = sprayDecals.shift();
  oldDecal?.dispose();
}
```

Do not allow the scene to accumulate hundreds or thousands of decals beyond the cap.

### 7. Make each decal more visually effective

Since we are reducing decal count, make each decal do more visual work.

Use:

- slightly larger spray texture
- good alpha falloff
- noisy edge
- random rotation
- slight size variation
- slight opacity variation

But do not create a new texture for every variation.

Preferred approach:

- reuse texture/material per color
- vary decal size and rotation
- maybe vary alpha only if it does not require new material per decal

### 8. Avoid expensive operations inside pointermove

Do not run expensive work inside every pointer event.

Avoid:

- rebuilding `paintableMeshes`
- scanning all scene meshes
- creating new canvas textures
- creating new materials
- repeated console logs
- unnecessary object allocations
- unnecessary full scene operations

`paintableMeshes` should be built once after the GLB loads, then reused.

### 9. Keep Spray Mode behavior intact

When Spray Mode is ON:

- camera/orbit controls should be disabled
- cursor-reactive bust movement should be disabled
- the bust should stay fixed
- pointer should paint on the 3D surface

When Spray Mode is OFF:

- camera/orbit controls should return
- cursor-reactive bust movement should return
- painting should stop

### 10. Optional performance readout

If useful, add a small temporary debug counter:

- active decal count
- current max decals
- current spray interval

But do not update the DOM every frame. Update it at most a few times per second.

## Final expected result

After optimization:

- spray still creates a continuous-looking painted trail
- app does not become very slow after a few seconds
- decal count stays capped
- materials/textures are reused
- console is not spammed during active painting
- camera/model interaction still works when Spray Mode is off
- Clear Graffiti still removes all decals
- no blank screen
- no broken imports
- no console errors
