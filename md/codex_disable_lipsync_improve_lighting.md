# Codex Task — Temporarily Remove Lipsync and Improve Model Lighting

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

Work on the existing “Artigas Canta” Babylon.js web app.

Before adding new features like sockets, shaders, or APIs, clean up the current visual base:

1. Temporarily remove / disable the lipsync feature.
2. Improve the lighting and material presentation of the 3D bust models.

Do not rewrite the whole app. Inspect the existing code and make careful changes.

## Current problems

- The lipsync is not needed right now and may be visually interfering with the bust.
- The model lighting in the web app looks strange / uneven / not polished.
- We need the busts to look better as bronze/statue objects before adding more conceptual features.

## Main goals

- Temporarily disable lipsync.
- Remove or hide any procedural mouth fallback.
- Keep music playback working.
- Keep spray graffiti working.
- Keep character/model selector working.
- Improve lighting so the busts look more like outdoor bronze statues or museum/monument sculptures.
- Make lighting stable across multiple GLB models.

## Important constraints

- Keep Babylon.js.
- Do not use Three.js.
- Do not delete the lipsync source files permanently unless clearly unnecessary.
- Prefer disabling/commenting/isolating lipsync so it can be restored later.
- Do not break audio playlist.
- Do not break spray mode.
- Do not break screenshot capture.
- Do not break model switching.
- Do not modify the original GLB files.
- Do not rewrite the whole app.

---

# Part 1 — Disable lipsync temporarily

Find the current lipsync implementation.

Likely files/modules may include:

```text
src/scene/lipsync.js
src/scene/audio.js
src/main.js
```

Disable lipsync cleanly.

## Requirements

- Do not animate morph targets.
- Do not animate jaw/mouth meshes.
- Do not create procedural mouth overlays.
- Dispose or hide any existing procedural mouth mesh.
- Do not call `lipsyncSystem.update()` in the render loop.
- Keep the audio playlist/music system working.
- Keep the audio analyser only if needed for future features, but do not drive mouth animation.

Preferred approach:

```js
const ENABLE_LIPSYNC = false;
```

Then guard all lipsync creation/update logic:

```js
if (ENABLE_LIPSYNC) {
  lipsyncSystem = createLipsyncSystem(...);
}
```

In the render loop:

```js
if (ENABLE_LIPSYNC) {
  lipsyncSystem?.update(deltaTime);
}
```

If a procedural mouth exists, make sure it is removed when lipsync is disabled:

```js
proceduralMouth?.dispose();
proceduralMouth = null;
```

## UI cleanup

Remove or hide lipsync-specific UI/debug readouts such as:

```text
Lipsync: activo
Amp: 0.42
```

Do not remove music controls.

## Expected result

- No mouth overlay appears.
- No lipsync movement happens.
- The bust looks like a clean statue again.
- Music still plays/mutes/skips as currently designed.

---

# Part 2 — Improve lighting

The current lighting looks strange. Rework the scene lighting for a cleaner bronze/statue presentation.

The goal is not flashy lighting. The goal is readable sculptural volume.

## Desired look

The busts should feel like:

- outdoor bronze monuments
- softly lit museum objects
- readable from front and 3/4 views
- not overexposed
- not flat
- not too glossy
- not too dark
- with clear facial planes
- with subtle rim separation from background

## Recommended lighting setup

Use a simple, stable lighting rig:

1. Hemispheric ambient/fill light.
2. Large soft key light from front-left.
3. Soft rim/back light from rear-right.
4. Optional weak fill from front-right.

Example Babylon-style setup:

```js
const hemi = new BABYLON.HemisphericLight(
  "hemiLight",
  new BABYLON.Vector3(0, 1, 0),
  scene
);
hemi.intensity = 0.45;
hemi.diffuse = new BABYLON.Color3(0.8, 0.82, 0.85);
hemi.groundColor = new BABYLON.Color3(0.12, 0.1, 0.08);

const key = new BABYLON.DirectionalLight(
  "keyLight",
  new BABYLON.Vector3(-0.45, -0.8, -0.35),
  scene
);
key.intensity = 1.25;
key.diffuse = new BABYLON.Color3(1.0, 0.92, 0.82);

const rim = new BABYLON.DirectionalLight(
  "rimLight",
  new BABYLON.Vector3(0.6, -0.3, 0.7),
  scene
);
rim.intensity = 0.55;
rim.diffuse = new BABYLON.Color3(0.55, 0.75, 1.0);
```

Adjust values based on existing scene orientation.

## Avoid

- too many lights
- harsh shadows
- blown-out highlights
- fully flat ambient light
- extreme blue/orange contrast
- postprocessing that makes the model muddy
- lights attached incorrectly to old disposed models

## Shadows

For now, keep shadows OFF unless they are already working well.

If shadows are causing artifacts or performance issues, disable them.

Report in comments or console:

```js
console.log("Lighting: shadows disabled for stable statue presentation");
```

## Background

Keep the background simple.

Options:

- black/dark gray background
- subtle gradient if already implemented
- no distracting environment

The bust should remain the visual center.

---

# Part 3 — Improve material response if needed

Some GLB models from AI tools may come with strange materials.

Inspect loaded materials and normalize them lightly if needed.

Do not destroy original textures unless necessary.

## For bronze/statue look

If a model material looks too flat, too plastic, too bright, or too glossy, adjust safe PBR values.

For PBR materials:

```js
material.metallic = 0.75;
material.roughness = 0.55;
```

For non-PBR StandardMaterial, consider converting only if safe, or adjust:

```js
material.specularColor = new BABYLON.Color3(0.25, 0.22, 0.18);
```

Avoid making every model identical if their materials already look good.

## Optional bronze normalization

Add a toggle or constant:

```js
const NORMALIZE_STATUE_MATERIALS = true;
```

If enabled, apply a subtle bronze/patina-friendly material adjustment to loaded models.

Suggested target:

- darker bronze base
- moderate roughness
- controlled specular highlights
- not mirror-like
- not matte-black

Do not override graffiti decal materials.

Do not override UI/helper/procedural materials.

---

# Part 4 — Camera framing

Lighting can look wrong if the model is framed badly.

When loading a model:

- compute bounding box
- center model
- scale model consistently
- set camera target to model center
- set camera radius based on model size

The bust should be well framed and not too close to the camera.

Avoid clipping.

---

# Part 5 — Debug lighting controls

Add a small temporary debug toggle or constants for lighting.

Example:

```js
const DEBUG_LIGHTING = true;
```

When enabled, log:

```js
console.group("Lighting Setup");
console.log("Hemi intensity:", hemi.intensity);
console.log("Key intensity:", key.intensity);
console.log("Rim intensity:", rim.intensity);
console.log("Shadows enabled:", false);
console.groupEnd();
```

Do not spam logs every frame.

Optional: add a small hidden/toggleable debug section in UI, but only if easy.

---

# Part 6 — Preserve existing features

After changes, these must still work:

- model selector
- model loading from manifest
- spray mode
- persistent graffiti
- clear graffiti
- screenshot capture
- side control panel
- music playlist
- mute/unmute
- next track
- camera interaction when Spray Mode is off
- frozen camera/model behavior when Spray Mode is on

---

# Final verification

Run:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm run build
npm run preview
```

Verify:

1. App loads without errors.
2. Model appears.
3. No lipsync mouth overlay is visible.
4. No mouth animation happens.
5. Music still works.
6. Mute/unmute still works.
7. Next track still works.
8. Lighting looks cleaner and more intentional.
9. Facial features are readable.
10. Bronze/statue material does not look flat or broken.
11. Spray mode still works.
12. Graffiti stays visible.
13. Clear graffiti still works.
14. Screenshot capture still works.
15. Model switching still works.
16. No blank screen.
17. No broken imports.
18. No console errors.

## Expected result

The app should now have a cleaner base presentation:

- no temporary lipsync/mouth artifacts
- better statue lighting
- clearer bust visibility
- more polished bronze/monument feel
- existing graffiti and music features preserved
