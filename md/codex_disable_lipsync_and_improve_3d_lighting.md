# Codex Task — Disable Lipsync and Improve 3D Model Lighting

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

Work on the existing “Artigas Canta” Babylon.js web app.

Do not rewrite the app. Make a focused cleanup pass:

1. Temporarily disable the lipsync feature.
2. Improve the lighting and visual presentation of the loaded 3D bust/statue models.

The app currently uses multiple low-poly GLB models loaded from the character selector. Make sure the lighting works consistently across all models.

---

## Main goals

- Disable lipsync temporarily.
- Remove/hide any procedural mouth overlay.
- Stop any mouth/jaw/morph animation.
- Keep music playlist working.
- Keep mute/unmute and next track working.
- Improve scene lighting for the 3D statues.
- Make the models feel like bronze/statue busts.
- Preserve spray graffiti.
- Preserve model selector.
- Preserve screenshot capture.
- Preserve side UI panel.

---

## Important constraints

- Keep Babylon.js.
- Do not switch to Three.js.
- Do not delete the lipsync files permanently.
- Prefer disabling lipsync with a flag so it can be restored later.
- Do not break audio playback.
- Do not break the music playlist.
- Do not break spray mode.
- Do not break graffiti accumulation.
- Do not break clear graffiti.
- Do not break screenshot capture.
- Do not break model switching.
- Do not modify the original GLB files.
- Do not rewrite the full app.

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

## Required behavior

- Do not create procedural mouth overlays.
- Do not animate morph targets.
- Do not animate jaw or mouth meshes.
- Do not call `lipsyncSystem.update()` in the render loop.
- Do not show lipsync debug UI.
- Do not show amplitude readouts.
- Keep music/audio playlist working normally.

Preferred implementation:

```js
const ENABLE_LIPSYNC = false;
```

Guard lipsync initialization:

```js
let lipsyncSystem = null;

if (ENABLE_LIPSYNC) {
  lipsyncSystem = createLipsyncSystem(...);
}
```

Guard render-loop updates:

```js
if (ENABLE_LIPSYNC) {
  lipsyncSystem?.update(deltaTime);
}
```

If a procedural mouth mesh already exists, dispose or hide it:

```js
proceduralMouth?.dispose();
proceduralMouth = null;
```

If the lipsync system creates any helper meshes, markers, or debug objects, disable them too.

## UI cleanup

Remove or hide any UI text like:

```text
Lipsync: activo
Amp: 0.42
```

Do not remove music controls.

The music section should still allow:

- mute/unmute
- next track
- current song display
- activation if browser autoplay blocks playback

## Expected result

After this part:

- no mouth overlay is visible
- no lipsync motion happens
- no morph targets are animated
- no jaw/mouth meshes move
- music still plays as a playlist/radio
- the busts look like clean statues again

---

# Part 2 — Improve lighting

The current lighting needs to be improved so all loaded GLB busts look better.

The desired look is:

- bronze/statue-like
- sculptural
- readable facial features
- soft but dimensional
- clear separation from background
- not flat
- not overexposed
- not too glossy
- not too dark

## Recommended lighting rig

Use a simple, stable lighting setup:

1. Ambient hemispheric fill.
2. Soft warm key light from front-left.
3. Cool subtle rim/back light from rear-right.
4. Optional weak fill if needed.

Example Babylon setup:

```js
const hemi = new BABYLON.HemisphericLight(
  "hemiLight",
  new BABYLON.Vector3(0, 1, 0),
  scene
);
hemi.intensity = 0.45;
hemi.diffuse = new BABYLON.Color3(0.82, 0.84, 0.88);
hemi.groundColor = new BABYLON.Color3(0.10, 0.085, 0.07);

const key = new BABYLON.DirectionalLight(
  "keyLight",
  new BABYLON.Vector3(-0.45, -0.85, -0.35),
  scene
);
key.intensity = 1.15;
key.diffuse = new BABYLON.Color3(1.0, 0.92, 0.82);

const rim = new BABYLON.DirectionalLight(
  "rimLight",
  new BABYLON.Vector3(0.6, -0.35, 0.75),
  scene
);
rim.intensity = 0.5;
rim.diffuse = new BABYLON.Color3(0.55, 0.7, 1.0);
```

Adjust the directions based on the app’s coordinate system and model orientation.

## Avoid

- too many lights
- harsh shadows
- flat ambient-only lighting
- blown highlights
- fully black crushed shadows
- excessive blue/orange contrast
- post-processing that makes the model muddy
- lights that remain attached to disposed models

## Shadows

For now, keep shadows OFF unless they are already working well.

If shadows are causing artifacts or reducing performance, disable them.

Add a simple console message once:

```js
console.log("Lighting: shadows disabled for stable statue presentation");
```

## Background

Keep the background simple and dark.

Suggested:

- black
- very dark charcoal
- subtle gradient if already implemented

The bust should remain the center of the composition.

---

# Part 3 — Material normalization for statue look

Some AI-generated GLB models may have inconsistent materials.

Add a safe material normalization step after each model loads.

Use a flag:

```js
const NORMALIZE_STATUE_MATERIALS = true;
```

If enabled, lightly adjust model materials to look more like bronze/statue surfaces.

## For PBR materials

If a material supports PBR-style properties:

```js
material.metallic = 0.75;
material.roughness = 0.55;
```

If the model already has good textures, avoid destroying them.

Do not replace textures unless necessary.

## For StandardMaterial

If a model uses StandardMaterial, adjust specular safely:

```js
material.specularColor = new BABYLON.Color3(0.22, 0.19, 0.15);
```

Avoid mirror-like surfaces.

Avoid making everything matte black.

## Optional bronze tint

If models look too neutral or plastic, apply a subtle bronze tint only if safe.

Suggested bronze tone:

```js
const bronzeTint = new BABYLON.Color3(0.42, 0.28, 0.16);
```

Do not override graffiti decal materials.

Do not override UI/helper/procedural materials.

Do not override spray materials.

Only apply material normalization to loaded character/model meshes.

---

# Part 4 — Camera and model framing

Lighting often looks wrong if the camera/model framing is inconsistent.

When each model loads:

- compute bounding box
- center model
- scale model consistently
- set camera target to model center
- set camera radius based on model height
- avoid clipping
- keep the bust well framed

The model should not be too close to the camera.

The model should not be too small.

The face and upper body should remain readable.

---

# Part 5 — Add minimal debug logging

Add a non-spamming lighting summary after scene setup or model load:

```js
console.group("Lighting Setup");
console.log("Hemi intensity:", hemi?.intensity);
console.log("Key intensity:", key?.intensity);
console.log("Rim intensity:", rim?.intensity);
console.log("Shadows enabled:", false);
console.log("Normalize materials:", NORMALIZE_STATUE_MATERIALS);
console.groupEnd();
```

Do not log every frame.

Do not log during every spray event.

---

# Preserve existing features

After this task, these must still work:

- model selector
- model loading from manifest
- low-poly model usage
- model centering/rescaling
- spray mode
- persistent graffiti
- clear graffiti
- screenshot capture
- side controls
- music playlist
- mute/unmute
- next track
- camera orbit/zoom when Spray Mode is off
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
2. Models load from the selector.
3. No lipsync mouth overlay is visible.
4. No lipsync animation happens.
5. Music still works.
6. Mute/unmute still works.
7. Next track still works.
8. Lighting looks cleaner and more intentional.
9. Bust facial features are readable.
10. Bronze/statue material does not look flat, plastic, overexposed, or too dark.
11. Spray mode still works.
12. Graffiti stays visible and accumulates.
13. Clear graffiti still works.
14. Screenshot capture still works.
15. Model switching still works.
16. Camera/orbit interaction works when Spray Mode is off.
17. Spray Mode still freezes camera/model movement while painting.
18. No blank screen.
19. No broken imports.
20. No console errors.

---

## Expected result

The app should now have a cleaner visual base:

- lipsync temporarily disabled
- no fake/procedural mouth visible
- models read as statues/busts
- improved lighting
- better bronze/monument feel
- all existing graffiti/music/model/capture features preserved
