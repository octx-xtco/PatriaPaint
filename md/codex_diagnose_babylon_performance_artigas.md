# Codex Task — Diagnose Babylon.js Performance Bottlenecks

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

The app works, including spray paint, but it remains slow even after decal optimization and after testing with:

```bash
npm run build
npm run preview
```

Do not optimize blindly.

Add a performance diagnostics panel and identify the real bottleneck.

Do not rewrite the app. Inspect the existing project and add diagnostics safely.

## Main goal

We need to understand why the app is slow.

Possible bottlenecks include:

- GLB model complexity
- too many decals / meshes
- too many transparent objects
- too many materials or textures
- high device pixel ratio / Retina rendering resolution
- shadows
- postprocessing
- console logging
- expensive pointer/spray operations
- rebuilding scene data during spray
- unoptimized Babylon engine settings

## Requirements

Add a small debug/performance overlay showing:

- FPS
- total scene meshes
- active spray decals
- total vertices
- total materials
- total textures
- Babylon engine hardware scaling level
- whether shadows are enabled
- whether postprocessing is enabled
- approximate GLB mesh count and vertex count
- render width / render height
- canvas client width / height
- `window.devicePixelRatio`

Update this panel only 2 times per second, not every frame.

Do not spam the console every frame.

## One-time scene summary

After the GLB loads, log a one-time scene summary:

```js
console.group("Scene Performance Summary");

console.log("Meshes:", scene.meshes.length);
console.log("Materials:", scene.materials.length);
console.log("Textures:", scene.textures.length);
console.log("Total vertices:", totalVertices);
console.log("Device pixel ratio:", window.devicePixelRatio);
console.log("Render size:", engine.getRenderWidth(), engine.getRenderHeight());
console.log("Canvas client size:", canvas.clientWidth, canvas.clientHeight);
console.log("Hardware scaling level:", engine.getHardwareScalingLevel?.());

console.groupEnd();
```

Also log a model-specific summary:

```js
console.group("GLB Model Summary");

console.log("Model meshes:", modelMeshes.length);
console.log("Model vertices:", modelVertices);
console.log("Model materials:", modelMaterials);
console.log("Model textures:", modelTextures);
console.log("Paintable meshes:", paintableMeshes?.map(m => m.name));

console.groupEnd();
```

Use safe checks if any variable is unavailable.

## Performance overlay

Create or update a small overlay in the UI.

Suggested fields:

```text
FPS: 42
Meshes: 382
Decals: 218 / 350
Vertices: 184,000
Materials: 27
Textures: 18
DPR: 2
Render: 2880 x 1800
Scale: 1.5
Shadows: off
PostFX: off
```

Keep it small and readable.

It can be hidden behind a debug toggle if needed, but make it visible during this diagnostic task.

## Add safe global performance toggles

Implement safe performance toggles or constants.

### 1. Hardware scaling

Add this by default:

```js
engine.setHardwareScalingLevel(1.5);
```

Also make it easy to test:

```js
const HARDWARE_SCALING_LEVEL = 1.5; // test 1, 1.5, 2
```

Higher values reduce internal render resolution and usually improve performance on Retina screens.

The app should still look acceptable.

### 2. Shadows

If shadows are enabled, add a way to disable them.

For testing, default shadows to OFF.

If no shadows exist, just report `Shadows: off`.

### 3. Postprocessing

If bloom, glow, SSAO, depth of field, or other postprocessing is enabled, add a way to disable it.

For testing, default heavy postprocessing to OFF.

If no postprocessing exists, just report `PostFX: off`.

### 4. Spray decal cap

For testing, cap spray decals to:

```js
const MAX_DECALS = 250;
```

Make the current active decal count visible in the performance overlay.

### 5. Debug logs

Ensure graffiti debug logging is off by default:

```js
const DEBUG_GRAFFITI = false;
```

There should be no logs during every pointermove or decal creation unless the flag is true.

## Inspect spray performance

Inspect the graffiti/spray implementation and report through code comments or console summary:

- whether materials are cached
- whether textures are cached
- whether `paintableMeshes` is rebuilt during painting
- how many decals can be created per second approximately
- whether interpolation is capped
- whether old decals are disposed correctly

Do not make large architectural changes yet unless clearly safe.

## Do not replace the spray system yet

For this task, do not replace decals with texture painting yet.

Only diagnose and apply safe global performance improvements:

- hardware scaling
- shadows off
- postprocessing off
- decal cap
- no console spam
- performance overlay
- scene/model summary

After the diagnostics are visible, we can decide whether to switch to texture-based painting or further optimize assets.

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
3. Performance overlay appears.
4. FPS is visible.
5. Mesh count is visible.
6. Decal count is visible.
7. Vertex count is visible.
8. Render size and DPR are visible.
9. Hardware scaling is applied.
10. Shadows and postprocessing are reported.
11. Spray still works.
12. Clear graffiti still works.
13. Camera/model interaction still works when Spray Mode is off.
14. No blank screen.
15. No broken imports.
16. No console spam.

## Expected result

After this task, we should know whether the bottleneck is:

- model complexity
- decal count
- transparent decal rendering
- Retina/high render resolution
- shadows/postprocessing
- materials/textures
- console/DOM spam
- something else

The app should also run somewhat faster with hardware scaling and safer defaults.
