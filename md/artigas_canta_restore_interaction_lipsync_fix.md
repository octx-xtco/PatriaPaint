# Hermes / DeepSeek Prompt — Restore Interaction and Fix Audio-Reactive Mouth

Continue working on the existing “Artigas Canta” Babylon.js web app.

Current problems after the last adjustment:

1. The 3D bust/model is now fixed and no longer interacts with the cursor.
2. The user needs to be able to rotate/interact with the model again.
3. The camera should allow zoom and view adjustment.
4. The mouth does not move.
5. The mouth must move reactively to the sound of the selected song.

Do not rewrite the whole app from scratch. Fix the existing implementation.

## Main goals

Restore and implement:

- cursor-based interaction with the bust
- camera controls with zoom
- smooth model rotation based on pointer movement
- audio-reactive mouth movement
- reliable lipsync fallback if the GLB has no morph targets

The final result should be:

- the bust is visible and centered
- the user can orbit/zoom around it
- the bust subtly reacts to cursor movement
- the song plays
- the mouth opens/closes based on actual audio amplitude
- no blank screen
- no broken imports
- no long inline `node -e` commands

---

## Part 1 — Restore camera / model interaction

Use Babylon.js camera controls.

If the app does not already have proper camera interaction, implement an `ArcRotateCamera`.

Requirements:

- allow mouse drag orbit
- allow mouse wheel zoom
- allow touch drag
- allow pinch zoom if supported by Babylon defaults
- keep the camera centered on the bust
- limit extreme zoom and rotation so the user cannot lose the model

Suggested behavior:

```js
const camera = new BABYLON.ArcRotateCamera(
  "Camera",
  Math.PI / 2,
  Math.PI / 2.25,
  4,
  new BABYLON.Vector3(0, 1.1, 0),
  scene
);

camera.attachControl(canvas, true);

camera.lowerRadiusLimit = 1.8;
camera.upperRadiusLimit = 8;
camera.wheelPrecision = 50;
camera.pinchPrecision = 80;
camera.inertia = 0.75;
camera.angularSensibilityX = 1200;
camera.angularSensibilityY = 1200;
```

Adjust these values based on the actual model scale.

The bust should remain centered.

If the model appears too small or too large, compute its bounding box and frame it automatically.

---

## Part 2 — Add subtle cursor-reactive bust movement

Camera orbit/zoom should work, but also add a subtle automatic bust reaction to pointer position.

This should not fight the camera controls.

Implement a light interaction system:

- track normalized pointer position from -1 to 1
- apply subtle rotation to the bust root
- smooth with damping
- keep it small and elegant

Example:

```js
targetRotationY = pointerX * 0.12;
targetRotationX = pointerY * 0.06;

bustRoot.rotation.y += (targetRotationY - bustRoot.rotation.y) * 0.06;
bustRoot.rotation.x += (targetRotationX - bustRoot.rotation.x) * 0.06;
```

Important:

- if the user is actively orbiting the camera, avoid fighting the camera.
- keep the motion subtle.
- do not lock the model.
- do not disable camera controls.

If needed, separate:

- camera orbit = user navigation
- bust idle/cursor movement = subtle object animation

---

## Part 3 — Diagnose why mouth is not moving

Before changing lipsync blindly, inspect and log the audio/lipsync system.

Add clear logs:

```js
console.group("Audio / Lipsync Debug");
console.log("Audio element:", audioElement);
console.log("Audio paused:", audioElement.paused);
console.log("Audio currentTime:", audioElement.currentTime);
console.log("Audio duration:", audioElement.duration);
console.log("AudioContext state:", audioContext?.state);
console.log("Analyser:", analyser);
console.log("Current amplitude:", amplitude);
console.log("Lipsync strategy:", strategyName);
console.groupEnd();
```

But do not spam every frame. Log once on play and optionally once per second while debugging.

Check:

- Is the selected audio file actually loading?
- Is the audio playing?
- Is the AudioContext resumed after user interaction?
- Is the MediaElementSource connected to the analyser?
- Is the analyser connected to audioContext.destination?
- Is amplitude changing over time?
- Is the lipsync update called inside the render loop?
- Is the procedural mouth visible?
- Is the procedural mouth parented to the correct object or scene?
- Is the mouth placed in front of the model and not hidden inside the mesh?
- Is the mouth scale being updated every frame?

---

## Part 4 — Fix Web Audio connection

Make sure audio analysis uses a single persistent audio system.

Important browser rule:

Do not create multiple `MediaElementSourceNode` instances for the same audio element.

Create it once.

Use something like:

```js
const audioContext = new AudioContext();
const source = audioContext.createMediaElementSource(audioElement);
const analyser = audioContext.createAnalyser();

analyser.fftSize = 1024;
source.connect(analyser);
analyser.connect(audioContext.destination);

const dataArray = new Uint8Array(analyser.frequencyBinCount);
```

On Play button click:

```js
await audioContext.resume();
await audioElement.play();
```

On pause:

```js
audioElement.pause();
```

When switching songs:

- pause current audio
- change `audioElement.src`
- call `audioElement.load()`
- do not recreate the MediaElementSourceNode if using the same audio element
- keep the analyser connected

---

## Part 5 — Implement reliable amplitude detection

Use time-domain RMS for mouth movement.

Example:

```js
function getAmplitude() {
  analyser.getByteTimeDomainData(dataArray);

  let sum = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const v = (dataArray[i] - 128) / 128;
    sum += v * v;
  }

  const rms = Math.sqrt(sum / dataArray.length);
  return Math.min(1, rms * 4.5);
}
```

Smooth it:

```js
rawAmplitude = getAmplitude();
smoothedAmplitude += (rawAmplitude - smoothedAmplitude) * 0.22;
mouthOpen = Math.min(1, Math.max(0, smoothedAmplitude));
```

If the audio is paused, decay smoothly:

```js
smoothedAmplitude += (0 - smoothedAmplitude) * 0.18;
```

---

## Part 6 — Make the procedural mouth visibly move

If the GLB has no morph targets, use the procedural mouth fallback.

Make sure the procedural mouth:

- is visible
- is dark/black
- is positioned on the lower front face
- is slightly in front of the surface, not inside it
- scales vertically with amplitude
- remains subtle when closed

Use constants at the top of `lipsync.js`:

```js
const PROCEDURAL_MOUTH_CONFIG = {
  offset: { x: 0, y: 1.15, z: -0.42 },
  baseScale: { x: 0.22, y: 0.025, z: 1 },
  openScaleMultiplier: 5.5,
  forwardOffset: 0.025
};
```

Adjust based on actual model orientation.

If the model faces the opposite direction, flip the Z offset.

Add visible debug mode:

```js
const DEBUG_MOUTH = true;
```

When `DEBUG_MOUTH` is true:

- make the mouth slightly more visible
- log its world position
- add optional tiny helper sphere at the mouth position

Then once it works, keep the debug flag easy to turn off.

The mouth animation should be obvious enough to verify:

```js
mouthMesh.scaling.y =
  baseScaleY * (1 + mouthOpen * openScaleMultiplier);
```

Do not make it so subtle that it looks broken.

---

## Part 7 — Morph target support if available

Still support morph targets if they exist.

Inspect morph target managers.

For Babylon.js, check meshes for:

```js
mesh.morphTargetManager
```

For each target:

```js
target.name
target.influence
```

If target name includes:

- mouth
- jaw
- open
- viseme
- aa
- oh

drive it with amplitude:

```js
target.influence = mouthOpen;
```

But if no useful morph targets exist, immediately use procedural mouth.

Do not get stuck trying to use nonexistent morph targets.

---

## Part 8 — Ensure lipsync update is called

In the render loop, make sure this exists:

```js
engine.runRenderLoop(() => {
  const deltaTime = engine.getDeltaTime() / 1000;

  interactionSystem?.update(deltaTime);
  lipsyncSystem?.update(deltaTime);

  scene.render();
});
```

If `lipsyncSystem.update()` is missing, add it.

If the update exists but amplitude is always zero, fix the audio analyser.

If amplitude changes but the mouth does not move, fix the mouth mesh reference / placement / scaling.

---

## Part 9 — UI behavior

Keep the Spanish UI.

Make sure:

- Play/Pause starts and stops audio
- selecting another song changes the audio source
- volume slider works
- progress bar updates
- audio does not autoplay without click
- lipsync starts after the user presses Play

Add a small temporary debug readout if useful:

```text
Amp: 0.42
Lipsync: procedural
```

It can be hidden later, but for now it helps confirm the system works.

---

## Part 10 — Final checks

After fixing:

1. Start the app with `npm run dev`.
2. Confirm the bust loads.
3. Confirm mouse drag orbits camera.
4. Confirm mouse wheel zoom works.
5. Confirm subtle cursor reaction works.
6. Select a song.
7. Press Play.
8. Confirm audio plays.
9. Confirm amplitude changes in debug.
10. Confirm mouth visibly moves to the sound.
11. Confirm Pause makes mouth close smoothly.
12. Confirm no console errors.

---

## Constraints

- Keep Babylon.js.
- Do not use Three.js.
- Do not rewrite the project from scratch.
- Do not delete the GLB.
- Do not modify the GLB file.
- Do not use long inline terminal scripts.
- Do not download random external libraries.
- Do not break the existing model loader.
- Prioritize a working visible result over a perfect technical solution.

---

## Expected result

After this task:

- the model is interactive again
- the user can orbit and zoom the camera
- the bust subtly reacts to the cursor
- the mouth visibly opens and closes with the music
- the lipsync uses real audio amplitude
- if no rig exists, the procedural mouth fallback works
- the app remains stable and clean
