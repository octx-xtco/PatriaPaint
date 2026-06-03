# Codex Task — Optimize Slow Spray Paint Performance

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

The “Artigas Canta” Babylon.js app is working, including the spray paint feature, but the app becomes very slow while painting.

This was tested with:

```bash
npm run build
npm run preview
```

and it is still slow, so do not blame Vite dev server overhead. The problem is likely the spray implementation itself: too many decals/meshes, too many transparent objects, too much interpolation density, repeated material/texture creation, or console spam.

Do not rewrite the whole app. Optimize the existing spray system.

## Current situation

- The 3D bust loads.
- Spray Mode works.
- The user can paint on the bust.
- But performance drops significantly while painting.
- The current paint may also look like repeated circular dots/blobs rather than a natural spray stroke.

## Main goals

- Keep the spray feature working.
- Keep painting on the actual 3D bust surface.
- Keep the app responsive on a Mac M1 8GB.
- Reduce the number of decals/meshes created.
- Reuse materials and textures.
- Avoid excessive console logging.
- Keep the visual result continuous enough.
- Preserve Spray Mode behavior.
- Preserve camera/model interaction when Spray Mode is off.
- Preserve Clear Graffiti.

## Important constraints

- Keep Babylon.js.
- Do not switch to Three.js.
- Do not use Unity code.
- Do not use a 2D screen overlay.
- Do not paint only on the screen.
- Do not modify the original GLB file.
- Do not rewrite the full app.
- Do not leave broken imports.
- Do not leave a blank screen.
- Do not use long inline terminal scripts.

## First step: inspect current spray code

Before changing things, inspect:

- `src/scene/graffiti.js`
- `src/main.js`
- UI control wiring
- current spray constants
- current decal creation code
- material/texture creation code
- interpolation code
- continuous spray loop
- debug logs
- decal cleanup logic

Identify:

- how many decals are created per pointer move
- whether a new material is created per decal
- whether a new texture/canvas is created per decal
- whether console logging happens during every spray event
- whether interpolation is creating too many steps
- whether burst mode creates multiple decals per point
- whether old decals are disposed correctly

## 1. Do not create new material or texture for every decal

This is critical.

Do not generate a new material, canvas, DynamicTexture, or procedural spray texture for every paint mark.

Instead:

- create one cached material per spray color / opacity combination
- reuse that material for all decals of the same color
- cache procedural spray textures
- do not generate canvas textures inside every pointer event
- create texture/material variants only when selected color or opacity changes

Suggested structure:

```js
const materialCache = new Map();

function getSprayMaterial(color, opacity, scene) {
  const key = `${color}_${opacity}`;

  if (materialCache.has(key)) {
    return materialCache.get(key);
  }

  const material = createSprayMaterial(color, opacity, scene);
  materialCache.set(key, material);
  return material;
}
```

Make sure `createSprayMaterial` is not called from every pointermove/decal creation.

## 2. Reduce decal density

The app is likely slow because the spray creates too many decals.

Tune constants to something conservative:

```js
const MAX_DECALS = 350;
const MIN_SPRAY_INTERVAL_MS = 28;
const SPRAY_SPACING_MULTIPLIER = 0.8;
const SPRAY_BURST_COUNT = 1;
const MAX_INTERPOLATION_STEPS = 4;
```

These values can be adjusted, but prioritize responsiveness.

Avoid creating dozens of decals per pointer move.

## 3. Keep interpolation, but cap it hard

Interpolation is useful for continuous strokes, but it must not create too many decals.

Use a cap:

```js
const spacing = spraySize * SPRAY_SPACING_MULTIPLIER;

const steps = Math.min(
  MAX_INTERPOLATION_STEPS,
  Math.max(1, Math.ceil(distance / spacing))
);
```

Do not let fast mouse movement create 20, 40, or 80 decals in one event.

## 4. Avoid spraying when the pointer barely moved

Use a minimum distance threshold.

Example:

```js
const MIN_SPRAY_DISTANCE = spraySize * 0.55;
```

If the pointer barely moved and the last spray time was recent, skip decal creation.

## 5. Reduce or remove burst decals

If the current system creates multiple decals per point, reduce it.

Use:

```js
const SPRAY_BURST_COUNT = 1;
```

If the spray looks too sparse, improve each decal’s texture/size rather than creating many more decals.

## 6. Make each decal visually stronger

Since decal count must be lower, each decal should do more visual work.

Use:

- slightly larger decals
- soft noisy alpha texture
- good alpha falloff
- random rotation
- slight size variation

Do not create new textures per variation.

It is okay to vary decal size and rotation because that does not require a new material.

Avoid varying material alpha per decal if that creates new materials. If alpha variation is needed, use a small set of cached material variants, not infinite new materials.

## 7. Optional: switch from dot decals to stroke decals

If the current spray still looks like dots and requires too many decals, implement elongated stroke decals between previous and current hit points.

This can improve both realism and performance.

Instead of creating many circular dots, create fewer elongated decals.

For each successful movement:

1. Store previous picked point, normal, and mesh.
2. On next pick, calculate movement distance and direction.
3. Create one elongated decal covering the segment between previous and current point.
4. Use a soft elongated spray texture.
5. Randomize rotation slightly.

Suggested concept:

```js
const distance = BABYLON.Vector3.Distance(lastPoint, currentPoint);

const strokeWidth = spraySize;
const strokeLength = Math.max(spraySize * 1.1, distance * 1.25);

const decalSize = new BABYLON.Vector3(
  strokeWidth,
  strokeLength,
  strokeWidth
);
```

If Babylon decal orientation requires a different axis, adjust it.

Important: only implement stroke decals if it can be done cleanly. Do not break working spray.

## 8. Disable console spam

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

Keep logs only for:

- spray mode toggles
- paintable mesh initialization
- clear graffiti
- debug mode

Console spam alone can cause major slowdown.

## 9. Do not scan/rebuild scene data during painting

Do not rebuild `paintableMeshes` inside pointer events.

Do not scan all scene meshes during every spray tick.

Build paintable meshes once after the GLB loads, then reuse the array.

Only update it if the model is reloaded.

## 10. Dispose old decals aggressively

Keep decal count capped.

Example:

```js
while (sprayDecals.length > MAX_DECALS) {
  const oldDecal = sprayDecals.shift();
  oldDecal?.dispose();
}
```

Do not allow the scene to accumulate hundreds/thousands of decals beyond the cap.

If there are already too many decals before the cap is applied, clean them up.

## 11. Avoid expensive DOM updates

If there is a spray debug counter or UI status, do not update it every frame.

Update it at most every 250–500 ms.

Avoid DOM writes during every pointermove.

## 12. Keep Spray Mode behavior

When Spray Mode is ON:

- camera/orbit controls should be disabled
- cursor-reactive bust movement should be disabled
- the bust should stay fixed
- pointer paints on the 3D surface

When Spray Mode is OFF:

- camera/orbit controls return
- cursor-reactive bust movement returns
- painting stops

## 13. Keep Clear Graffiti working

Clear graffiti should:

- dispose all decals
- empty `sprayDecals`
- not reload the model
- not dispose cached materials/textures unless explicitly needed

## 14. Add lightweight performance instrumentation

Add a temporary performance readout or console summary that does not spam:

- active decal count
- max decals
- average decals created per second if easy
- spray constants

Update at most twice per second.

This is only for tuning.

## Final verification

Run:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm run build
npm run preview
```

Then verify:

1. App loads without errors.
2. Bust appears.
3. Spray Mode OFF: camera/cursor interaction works.
4. Spray Mode ON: camera/model movement freezes.
5. Painting still works on the 3D surface.
6. Dragging creates a continuous-enough spray trail.
7. App remains responsive after several seconds of painting.
8. Decal count stays capped.
9. Materials/textures are reused.
10. Console is not spammed.
11. Clear graffiti removes all decals.
12. Spray Mode OFF restores normal interaction.
13. No blank screen.
14. No broken imports.
15. No console errors.

## Priority

Prioritize performance and responsiveness over dense paint.

The correct fix is not “more decals”.

The correct fix is:

- fewer decals
- cached materials/textures
- capped interpolation
- no console spam
- stronger decals
- optional elongated stroke decals if useful
