# Hermes / DeepSeek Prompt — Add Spray Paint Graffiti Feature

Continue working on the existing “Artigas Canta” Babylon.js web app.

New feature: allow the user to graffiti the 3D bust of Artigas with spray paint.

The user should be able to select a spray can color and paint directly onto the 3D model by clicking / dragging over the bust.

Do not rewrite the whole app. Add this feature to the existing Babylon.js app.


## Updated 3D model path

Use this new GLB as the current main bust model:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/3D/Meshy_AI_The_Resolute_General_0603023818_generate.glb
```

Copy this file into the web-accessible models folder:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/public/models/artigas_bust.glb
```

Do not delete or modify the original GLB.

The app should load the model from the browser path:

```text
/models/artigas_bust.glb
```

If another model is currently being loaded, replace that reference so the app uses this new GLB.

## Goal

Add an interactive spray paint mode:

- user selects a spray color
- user clicks or drags over the 3D bust
- paint appears on the model surface
- painting should feel like spray paint, not clean vector drawing
- paint should follow the 3D surface using raycasting
- multiple colors should be available
- include clear/reset graffiti button
- keep existing camera, audio, model loading, and UI working

## Important implementation note

Do not attempt full UV texture painting yet.

For this first version, implement spray painting using Babylon.js decals or surface-attached paint marks.

The practical MVP should be:

- raycast from pointer to model
- get hit point and surface normal
- place a small decal / circular paint mark on the hit surface
- while dragging, place multiple decals at intervals
- use random size, opacity, rotation, and slight scatter to simulate spray
- optionally emit short-lived particles from the cursor/hit point for spray feedback

This is enough for a strong interactive prototype.

## UI

Add a new small section to the existing Spanish UI panel.

Suggested UI text:

```text
Graffiti
Color
Negro
Rojo
Blanco
Celeste
Amarillo
Modo spray
Limpiar pintura
```

Controls:

- spray mode toggle button
- color picker or preset color buttons
- brush/spray size slider
- paint opacity slider if easy
- clear graffiti button

Suggested default colors:

```js
const SPRAY_COLORS = [
  { label: "Negro", value: "#111111" },
  { label: "Rojo", value: "#d71920" },
  { label: "Blanco", value: "#f5f5f5" },
  { label: "Celeste", value: "#5bc0eb" },
  { label: "Amarillo", value: "#ffd23f" }
];
```

Keep UI minimal and dark.

## Interaction behavior

When spray mode is OFF:

- camera orbit / zoom should work normally
- existing cursor interaction should work normally

When spray mode is ON:

- clicking and dragging over the bust should paint
- camera orbit should either be temporarily disabled while painting or only disabled while mouse button is down
- wheel zoom may remain active if it does not interfere
- pointer events should not break UI controls

Expected behavior:

- press/hold mouse or touch on the bust
- paint appears where the ray hits the mesh
- dragging creates a continuous sprayed line
- releasing stops painting

Use pointer events:

- pointerdown
- pointermove
- pointerup
- pointercancel

## Babylon.js decal approach

Use Babylon.js decal creation if possible.

For each spray mark:

1. Raycast against the bust meshes.
2. If there is a hit:
   - get picked mesh
   - get picked point
   - get surface normal
   - create decal oriented to the surface
   - use a small circular transparent texture
   - apply current spray color
   - randomize decal size and rotation slightly

Use something similar to:

```js
BABYLON.MeshBuilder.CreateDecal("sprayDecal", pickedMesh, {
  position: pickedPoint,
  normal: pickedNormal,
  size: new BABYLON.Vector3(size, size, size),
  angle: randomAngle
});
```

If exact Babylon.js API differs, inspect docs/types and use the correct syntax.

## Spray texture

Create a procedural spray texture in JavaScript.

Do not download external textures.

Generate a small canvas texture with:

- transparent background
- colored noisy circular spray
- dense center
- softer noisy edges
- random speckles
- alpha falloff

Create a function:

```js
function createSprayTexture(color, opacity) {
  // returns BABYLON.DynamicTexture or Texture from canvas
}
```

The texture should look like spray paint, not a perfectly clean circle.

Important:

- cache textures per color/opacity/size if possible
- avoid generating a new canvas texture for every single paint mark if that causes performance issues
- generating a few variants per color is fine

## Spray mark variation

Each spray mark should randomize:

- size
- opacity
- rotation
- slight position scatter along surface tangent
- speckle density if using texture variants

Example:

```js
const finalSize = baseSize * randomRange(0.75, 1.35);
const finalOpacity = baseOpacity * randomRange(0.6, 1.0);
const angle = Math.random() * Math.PI * 2;
```

## Continuous spray

When the pointer is held down:

- paint repeatedly while moving
- avoid placing decals every single frame if pointer barely moved
- use a minimum distance threshold between marks
- use a small time interval if needed

Example:

```js
const MIN_SPRAY_DISTANCE = 0.025;
const MIN_SPRAY_INTERVAL_MS = 18;
```

This should feel like a spray trail.

## Spray particles / feedback

Add optional visual feedback:

- small short-lived particles near the hit point
- colored like selected spray
- fade quickly
- do not overdo it

If particles complicate the app, skip them and focus on decals.

## Clear graffiti

Add a clear/reset function:

- keep track of all created spray decals
- when user clicks “Limpiar pintura”, dispose all decals
- empty the decals array

Example:

```js
for (const decal of sprayDecals) {
  decal.dispose();
}
sprayDecals.length = 0;
```

## File/module structure

Create or update:

```text
src/scene/graffiti.js
```

Suggested API:

```js
export function createGraffitiSystem(scene, camera, canvas, bustMeshes, controls) {
  return {
    setEnabled(enabled),
    setColor(color),
    setSize(size),
    setOpacity(opacity),
    clear(),
    dispose()
  };
}
```

Integrate it in `main.js`.

The graffiti system needs:

- scene
- camera
- canvas
- bust meshes / paintable meshes
- current UI state
- access to camera controls if needed, so painting can temporarily disable camera rotation while spraying

## Paintable meshes

Only allow painting on the bust/model.

Do not paint the UI, background, helper objects, lights, camera, procedural mouth, or debug helpers.

Create a list of paintable meshes after loading the model.

Filter out:

- invisible meshes
- helper meshes
- procedural mouth
- particles
- existing decals
- non-model UI objects

Suggested approach:

```js
const paintableMeshes = loadedMeshes.filter(mesh =>
  mesh.isVisible &&
  mesh.getTotalVertices &&
  mesh.getTotalVertices() > 0 &&
  !mesh.name.toLowerCase().includes("mouth") &&
  !mesh.name.toLowerCase().includes("helper")
);
```

## Camera control conflict

When spray mode is enabled:

- on pointerdown over the model, temporarily disable camera controls
- on pointerup/pointercancel, re-enable camera controls
- when pointerdown is not on the model, allow camera controls as usual

Pseudo:

```js
if (sprayMode && hitModel) {
  camera.detachControl(canvas);
  isPainting = true;
}

if (!isPainting) {
  camera.attachControl(canvas, true);
}
```

Be careful not to attach controls multiple times.

## Performance

Decals can become heavy if unlimited.

Add a max decal count:

```js
const MAX_DECALS = 600;
```

If decals exceed max:

- dispose the oldest decal
- remove it from the array

This prevents the app from slowing down.

## Debugging

Add console logs:

```js
console.log("Graffiti system initialized");
console.log("Paintable meshes:", paintableMeshes.map(m => m.name));
console.log("Spray mode:", enabled);
console.log("Spray color:", color);
```

Do not spam logs on every spray mark unless debug mode is enabled.

## Constraints

- Keep Babylon.js.
- Do not use Three.js.
- Do not rewrite the app from scratch.
- Do not break existing model loading.
- Do not break existing camera controls.
- Do not break existing audio controls.
- Do not modify the original GLB file.
- Do not download external textures.
- Do not use long inline `node -e` commands.
- Keep the app running even if spray particles are skipped.
- Prioritize a working decal-based spray graffiti MVP over real UV texture painting.
- Real texture painting can be added later.

## Final checks

After implementing:

1. Run the app with `npm run dev`.
2. Confirm the bust loads.
3. Confirm camera orbit and zoom still work.
4. Confirm spray mode can be enabled.
5. Confirm a color can be selected.
6. Click on the bust and verify paint appears.
7. Drag across the bust and verify spray trail appears.
8. Confirm graffiti follows the 3D surface.
9. Confirm “Limpiar pintura” removes all decals.
10. Confirm audio controls still work.
11. Confirm no console errors.

## Expected result

After this task:

- the user can enable spray mode
- the user can choose a paint color
- the user can click/drag on the Artigas bust
- paint marks appear on the 3D surface
- graffiti follows the bust shape via raycasting
- the user can clear all graffiti
- camera orbit/zoom still works when not painting
- existing audio/model/UI features remain stable
