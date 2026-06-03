# Hermes / DeepSeek Prompt — Implement Spray Paint Graffiti Feature

Implement a spray paint graffiti feature in the existing “Artigas Canta” Babylon.js web app.

Important: the spray must paint on the actual 3D bust surface, not on a 2D screen overlay.

Do not rewrite the whole app. Add this feature to the existing Babylon.js project.

## Current desired behavior

### When Spray Mode is OFF

- camera orbit / zoom works normally
- cursor-reactive bust movement works normally
- the user can interact with the 3D scene as before

### When Spray Mode is ON

- freeze the bust cursor-reactive movement
- disable camera orbit / drag / zoom if needed
- keep the bust fixed in place
- use the cursor only for painting
- clicking or dragging over the bust paints on the 3D model surface
- if the cursor is not over the bust, do not paint
- disabling Spray Mode restores normal camera and cursor interaction

Use Babylon.js raycasting + decals.

Do NOT:

- use a 2D canvas overlay
- paint on the screen
- use Three.js
- use Unity code
- use external spray-painting repos
- modify the original GLB file
- rewrite the app from scratch

## Implementation requirements

Create or update a module like:

```text
src/scene/graffiti.js
```

After the GLB model loads, create a list of paintable bust meshes.

Only include actual visible bust meshes with vertices.

Exclude:

- decals
- procedural mouth
- helper meshes
- particles
- UI-related meshes
- debug objects

Suggested paintable mesh filter:

```js
const paintableMeshes = loadedMeshes.filter(mesh =>
  mesh.isVisible &&
  mesh.getTotalVertices &&
  mesh.getTotalVertices() > 0 &&
  !mesh.name.toLowerCase().includes("decal") &&
  !mesh.name.toLowerCase().includes("mouth") &&
  !mesh.name.toLowerCase().includes("helper") &&
  !mesh.name.toLowerCase().includes("debug")
);
```

## Spray mode behavior

### On Spray Mode enabled

- call `camera.detachControl(canvas)`
- disable cursor-reactive bust movement
- enable spray pointer events
- log paintable mesh count and names

### On Spray Mode disabled

- stop active spraying
- call `camera.attachControl(canvas, true)`
- re-enable cursor-reactive bust movement

## Pointer behavior

- `pointerdown` over the bust starts painting
- `pointermove` while pressed continues painting
- `pointerup` / `pointercancel` stops painting

Use Babylon picking:

```js
const pick = scene.pick(scene.pointerX, scene.pointerY, mesh =>
  paintableMeshes.includes(mesh)
);
```

If picking fails, debug by temporarily using a broader predicate that includes any visible mesh with vertices. Then narrow it again once working.

For every successful pick:

- get picked mesh
- get picked point
- get surface normal
- create a decal at that position
- align decal to the surface normal
- make decal non-pickable
- store decal in a `sprayDecals` array

## Decal creation

Use Babylon.js decals:

```js
const decal = BABYLON.MeshBuilder.CreateDecal("sprayDecal", pickedMesh, {
  position: pickedPoint,
  normal: pickedNormal,
  size: new BABYLON.Vector3(size, size, size),
  angle: Math.random() * Math.PI * 2
});
```

If the exact Babylon API differs, use the correct Babylon.js syntax for `CreateDecal`.

For the first debug version, make the paint very obvious:

- bright red
- large size
- high opacity
- simple circular texture
- visible on the bust
- no subtle spray texture yet

Once visible red decals work, then add:

- selected spray colors
- smaller size
- noisy spray texture
- random size variation
- random opacity variation
- random rotation
- continuous spray trail while dragging

## Spray material

Create the spray material correctly:

- use a transparent circular/spray texture
- `material.hasAlpha = true`
- `material.useAlphaFromDiffuseTexture = true`
- decal should not receive picking
- decal should appear slightly above the surface if needed to avoid z-fighting

Generate the spray texture procedurally in JavaScript with a canvas:

- transparent background
- colored noisy circular spray
- dense center
- softer noisy edges
- random speckles
- alpha falloff

Do not download external textures.

## Continuous spray

While mouse/touch is held down, create decals as the pointer moves.

Use a minimum distance or time interval to avoid too many decals.

Example values:

```js
const MIN_SPRAY_DISTANCE = 0.025;
const MIN_SPRAY_INTERVAL_MS = 18;
```

Add a decal limit:

```js
const MAX_DECALS = 600;
```

If the limit is exceeded, dispose the oldest decal and remove it from the array.

## UI requirements

Add a small section to the existing Spanish UI:

- `Graffiti`
- `Modo spray`
- color presets:
  - Negro
  - Rojo
  - Blanco
  - Celeste
  - Amarillo
- spray size slider
- clear button: `Limpiar pintura`

Suggested colors:

```js
const SPRAY_COLORS = [
  { label: "Negro", value: "#111111" },
  { label: "Rojo", value: "#d71920" },
  { label: "Blanco", value: "#f5f5f5" },
  { label: "Celeste", value: "#5bc0eb" },
  { label: "Amarillo", value: "#ffd23f" }
];
```

## Clear graffiti behavior

The clear button should:

- dispose every decal in `sprayDecals`
- empty the array
- not reload the model

## Debug logs

Add useful debug logs:

```js
console.log("Graffiti system initialized");
console.log("Spray mode:", enabled);
console.log("Paintable meshes:", paintableMeshes.map(m => m.name));
console.log("Pick hit:", !!pick?.hit);
console.log("Picked mesh:", pick?.pickedMesh?.name);
console.log("Picked point:", pick?.pickedPoint);
console.log("Picked normal:", pick?.getNormal?.());
console.log("Decal created");
```

Do not spam logs every frame unless debug mode is enabled.

## Debug Test Decal

Add a temporary “Debug Test Decal” button if useful.

It should:

- try to place one large red decal on the visible/front area of the bust
- if it cannot, log why:
  - no paintable meshes
  - no pick hit
  - invalid normal
  - decal creation failed

## Final checks

1. Run the app with `npm run dev`.
2. Confirm the bust loads.
3. Confirm normal camera/cursor interaction works when Spray Mode is OFF.
4. Turn Spray Mode ON.
5. Confirm the camera and bust stay fixed.
6. Click on the bust.
7. Confirm a visible red decal appears.
8. Drag over the bust.
9. Confirm a continuous spray trail appears.
10. Change color and confirm the paint color changes.
11. Click `Limpiar pintura` and confirm all decals disappear.
12. Turn Spray Mode OFF and confirm camera/cursor interaction returns.
13. Confirm no console errors.

## Expected result

- Spray Mode ON freezes scene interaction and turns the cursor into a painting tool.
- Clicking/dragging over the bust paints visible spray decals on the actual 3D surface.
- Spray Mode OFF restores normal 3D interaction.
- The app remains stable.
