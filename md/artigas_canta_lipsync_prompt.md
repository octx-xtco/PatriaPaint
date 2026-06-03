# Hermes / DeepSeek Prompt — Add Lipsync to Artigas Canta

Continue working on the existing “Artigas Canta” Babylon.js web app.

The GLB bust is already loading correctly.

Now implement lipsync.

Important: do this in a careful diagnostic-first way.

## Goal

Make the Artigas bust sing the selected song using audio-reactive lipsync.

The lipsync should work even if the GLB model has no facial rig, no morph targets, and no separate mouth mesh.

## Step 1 — Inspect the loaded GLB

After loading the GLB, inspect all meshes and log useful model information:

- mesh names
- whether any mesh has morph targets
- morph target names
- whether any mesh name suggests mouth/jaw:
  - mouth
  - jaw
  - boca
  - mandibula
  - lips
  - labio
- bounding box dimensions
- approximate head/front orientation

Add clear console logs like:

```js
console.group("Artigas GLB Inspection");
console.log("Mesh:", mesh.name);
console.log("Morph targets:", morphTargetNames);
console.groupEnd();
```

Do not break the current loading behavior.

## Step 2 — Lipsync priority system

Implement lipsync in this priority order:

### 1. Morph target lipsync

If the GLB has morph targets named something like:

- mouthOpen
- jawOpen
- MouthOpen
- viseme_A
- viseme_O
- viseme_M
- viseme_aa
- open

then drive those morph targets using smoothed audio amplitude.

### 2. Mouth / jaw mesh lipsync

If there is a separate mesh named:

- mouth
- jaw
- boca
- mandibula
- lips
- labio

then animate that mesh using audio amplitude:

- small vertical scale
- small downward translation
- or jaw-like rotation

### 3. Procedural mouth fallback

If no morph target or mouth mesh exists, create a procedural mouth overlay attached to the bust.

This is the most important fallback.

Create a simple dark mouth shape:

- black or very dark material
- small horizontal oval
- positioned on the front lower face
- parented to the bust root or scene
- placed approximately over Artigas’ mouth area
- scaled vertically according to audio amplitude

The procedural mouth should look like an intentional stylized mouth, not a random floating object.

Use a thin dark oval / rounded shape. If Babylon.js has no simple oval primitive, create one using a scaled disc, plane, or custom mesh.

The mouth should:

- be subtle when closed
- open vertically when audio amplitude rises
- close when paused
- move smoothly, not jitter
- be easy to reposition with constants at the top of the file

Add mouth placement constants such as:

```js
const PROCEDURAL_MOUTH_OFFSET = {
  x: 0,
  y: 0.15,
  z: -0.55
};

const PROCEDURAL_MOUTH_SCALE = {
  x: 0.22,
  y: 0.035,
  z: 1
};
```

Adjust these based on the loaded bust bounding box.

## Step 3 — Audio analysis

Use Web Audio API.

The app already has audio playback or should create it if missing.

Implement:

- AudioContext
- MediaElementAudioSourceNode
- AnalyserNode
- Uint8Array frequency/time-domain data
- smoothed amplitude value

Important browser behavior:

- AudioContext must start/resume only after user interaction.
- Do not autoplay.
- Play button should resume the AudioContext before playing audio.

Amplitude calculation:

- use analyser frequency data or time-domain RMS
- normalize amplitude to 0–1
- apply smoothing / damping
- clamp values

Example behavior:

```js
rawAmplitude = calculateRMS(dataArray);
smoothedAmplitude += (rawAmplitude - smoothedAmplitude) * 0.18;
mouthOpen = clamp(smoothedAmplitude * 3.0, 0, 1);
```

Avoid jitter.

## Step 4 — Lipsync module

Create or update:

```text
src/scene/lipsync.js
```

The module should expose something like:

```js
export function createLipsyncSystem(scene, bustRoot, loadedMeshes, audioSystem) {
  return {
    update(deltaTime),
    setEnabled(enabled),
    dispose()
  };
}
```

It should internally choose the best available lipsync strategy:

- morph target
- jaw/mouth mesh
- procedural mouth

Log which strategy is being used:

```js
console.log("Lipsync strategy: morph targets");
console.log("Lipsync strategy: mouth mesh");
console.log("Lipsync strategy: procedural mouth fallback");
```

## Step 5 — Integrate with render loop

In the main render loop, call:

```js
lipsyncSystem.update(deltaTime);
```

Make sure this runs continuously but does nothing destructive when audio is paused.

When audio is paused:

- mouth should return to closed position smoothly.

When audio plays:

- mouth should open/close based on audio amplitude.

## Step 6 — UI

Keep the existing Spanish UI.

Make sure:

- song selector works
- play/pause works
- volume works
- progress bar works
- lipsync starts only when the selected song is playing

Add a small visible status line if useful:

```text
Lipsync: activo
```

or keep it only in console if that looks cleaner.

## Step 7 — Debug controls

Add temporary debug constants or simple keyboard shortcuts to adjust procedural mouth placement if needed.

For now, constants are enough.

At the top of `lipsync.js`, include:

```js
const DEBUG_MOUTH = true;
```

When enabled:

- log procedural mouth position
- optionally show a faint helper marker
- make it easy to tune the mouth offset

Do not clutter the final UI.

## Important constraints

- Do not modify the GLB file itself.
- Do not assume the model has morph targets.
- Do not rename the GLB.
- Do not break the existing scene.
- Do not use long inline `node -e` commands.
- Do not download external libraries unless necessary.
- Keep Babylon.js.
- Keep the app running even if lipsync fallback is used.

## Practical priority

Prioritize a visible working lipsync over a technically perfect one.

If the model has no facial rig, use the procedural mouth fallback immediately.

Do not waste time trying to force nonexistent morph targets.

## Expected result

After this task:

- the bust still loads correctly
- the selected song plays
- the app analyzes audio amplitude
- Artigas’ mouth opens and closes with the song
- if the GLB has no mouth rig, a procedural dark mouth fallback is used
- the lipsync is smooth enough to feel intentional
