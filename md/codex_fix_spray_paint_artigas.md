# Codex Task — Fix Spray Paint on 3D Bust

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

Open and inspect the existing project files before making changes.

The app is “Artigas Canta”, a Babylon.js web app with a loaded GLB bust model. The spray paint / graffiti feature was attempted several times but still does not work. Your task is to read the current code, understand how the app is structured, and fix the spray painting so it actually paints visible marks on the 3D bust.

Do not rewrite the whole app from scratch. Work with the existing codebase.

## Main problem

The spray paint feature currently does not create visible paint on the 3D bust.

Expected behavior:

- When Spray Mode is OFF:
  - normal camera orbit / zoom works
  - cursor-reactive model behavior works normally

- When Spray Mode is ON:
  - camera orbit / drag should be disabled
  - cursor-reactive bust movement should be disabled
  - the bust should stay fixed
  - clicking / dragging over the bust should paint visible marks on the actual 3D surface
  - if the cursor is not over the bust, do not paint
  - turning Spray Mode OFF restores normal camera / cursor interaction

## Important constraints

- Keep Babylon.js.
- Do not switch to Three.js.
- Do not use a 2D overlay canvas.
- Do not paint only on the screen.
- Do not use Unity code.
- Do not modify the original GLB file.
- Do not rewrite the full app.
- Do not use long inline terminal scripts.
- Do not leave broken imports or a blank screen.

## First step: inspect the project

Before coding, inspect:

- `package.json`
- `src/main.js`
- all files in `src/scene/`
- all files in `src/ui/`
- current graffiti/spray-related files
- model loading code
- camera/interaction code
- UI controls code

Find:

- how the GLB is loaded
- where loaded meshes are stored
- how camera controls are created
- how cursor-reactive movement is implemented
- how Spray Mode is currently wired
- whether `graffiti.js` exists
- whether pointer events are attached correctly
- whether `paintableMeshes` is empty or wrong
- whether decals are being created but invisible

## Fix approach

Implement or repair the spray system using Babylon.js raycasting + decals.

The intended technical flow is:

```text
pointerdown / pointermove
→ scene.pick(...)
→ hit actual bust mesh
→ get picked point + surface normal
→ create visible decal on picked mesh
→ store decal
→ repeat while dragging
```

## Make it work visibly first

Do not start with subtle spray.

First create a very obvious debug version:

- bright red decal
- large enough to clearly see
- high opacity
- simple circular texture or solid material
- no subtle alpha/noise at first
- visible on top of the bust

Only after a red debug decal is working should you restore:

- selected spray colors
- noisy spray texture
- smaller spray size
- randomized opacity/size/rotation
- continuous spray trail

## Paintable mesh detection

After the GLB loads, build `paintableMeshes` from the actual model meshes.

Log all candidate meshes:

```js
console.group("Paintable mesh candidates");
for (const mesh of loadedMeshes) {
  console.log({
    name: mesh.name,
    isVisible: mesh.isVisible,
    vertices: mesh.getTotalVertices?.(),
    isPickable: mesh.isPickable,
  });
}
console.groupEnd();
```

Set actual bust meshes to:

```js
mesh.isPickable = true;
```

Exclude:

- decals
- procedural mouth
- helper meshes
- debug objects
- particles
- UI meshes

But do not over-filter. If the filter is too strict, painting will never work.

Use a practical filter like:

```js
const paintableMeshes = loadedMeshes.filter(mesh => {
  const name = mesh.name.toLowerCase();
  return (
    mesh &&
    mesh.isVisible &&
    typeof mesh.getTotalVertices === "function" &&
    mesh.getTotalVertices() > 0 &&
    !name.includes("decal") &&
    !name.includes("helper") &&
    !name.includes("debug") &&
    !name.includes("mouth") &&
    !name.includes("particle")
  );
});
```

If this returns zero meshes, broaden the filter immediately and log why.

## Picking

Use Babylon picking against `paintableMeshes`.

Example:

```js
const pick = scene.pick(
  scene.pointerX,
  scene.pointerY,
  mesh => paintableMeshes.includes(mesh)
);
```

On pointerdown, log:

```js
console.log("Spray pointerdown", {
  x: scene.pointerX,
  y: scene.pointerY,
  hit: pick?.hit,
  pickedMesh: pick?.pickedMesh?.name,
  pickedPoint: pick?.pickedPoint?.toString?.(),
});
```

If picking fails:

1. Try a broader predicate:

   ```js
   mesh => mesh.isVisible && mesh.getTotalVertices?.() > 0
   ```

2. Make sure the Babylon canvas is receiving pointer events.
3. Make sure the mesh is pickable.
4. Make sure decals/helper meshes are not blocking picks.
5. Make sure the camera is not detached before pointer coordinates update.

## Surface normal

Get a valid normal for decal placement.

Use Babylon’s correct API for picked normals. If `pick.getNormal(true)` works, use it. Otherwise compute/fallback safely.

Log the normal.

If normal is missing, use a fallback direction from camera to picked point, but prefer the actual picked normal.

## Decal creation

Create decals with Babylon’s decal system.

Use the correct API for the installed Babylon.js version.

Expected structure:

```js
const decal = BABYLON.MeshBuilder.CreateDecal("sprayDecal", pick.pickedMesh, {
  position: pick.pickedPoint,
  normal,
  size: new BABYLON.Vector3(size, size, size),
  angle: Math.random() * Math.PI * 2,
});
```

Then:

```js
decal.material = sprayMaterial;
decal.isPickable = false;
sprayDecals.push(decal);
```

If decals are created but invisible, fix:

- material alpha
- texture alpha
- decal orientation
- decal size
- z-fighting
- picked mesh compatibility
- camera clipping
- material backface/culling

For debugging, use a very simple obvious material first.

## Debug material

Create a bright red material that is guaranteed to show.

Example:

```js
const mat = new BABYLON.StandardMaterial("debugSprayRed", scene);
mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
mat.emissiveColor = new BABYLON.Color3(0.7, 0, 0);
mat.alpha = 1;
mat.backFaceCulling = false;
```

Use this until decals are visibly working.

After that, replace with transparent spray texture.

## Spray Mode control

When Spray Mode is enabled:

```js
camera.detachControl(canvas);
```

Also disable cursor-reactive bust movement.

When Spray Mode is disabled:

```js
camera.attachControl(canvas, true);
```

Also re-enable cursor-reactive bust movement.

Avoid attaching camera controls multiple times.

## Pointer events

Use pointer events on the Babylon canvas.

Behavior:

- `pointerdown` over bust starts painting
- `pointermove` while pressed continues painting
- `pointerup` stops painting
- `pointercancel` stops painting

Make sure UI clicks do not trigger painting.

If pointer events are currently attached to the wrong element, fix them.

## Continuous spray

After one debug decal works:

- create decals repeatedly while dragging
- avoid creating too many decals per frame
- use a minimum interval or distance
- cap total decals

Example:

```js
const MAX_DECALS = 600;
const MIN_SPRAY_INTERVAL_MS = 18;
```

When max decals is exceeded, dispose the oldest decal.

## Clear graffiti

The “Limpiar pintura” button should:

```js
for (const decal of sprayDecals) {
  decal.dispose();
}
sprayDecals.length = 0;
```

Do not reload the model.

## Add a Debug Test button

Add a temporary button in the UI:

`Debug Test Decal`

When clicked, it should try to place one large red decal using a raycast from the center of the screen.

If it fails, log exactly why:

- no paintable meshes
- no pick hit
- missing picked point
- missing normal
- decal creation error

This button is important. It gives a reliable test independent of drag behavior.

## Final verification

Run:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm install
npm run dev
```

Then verify:

1. App loads without errors.
2. GLB bust appears.
3. Spray Mode OFF: camera/cursor interaction works.
4. Spray Mode ON: camera/model movement freezes.
5. Clicking the bust creates a visible red decal.
6. Dragging creates multiple marks.
7. Clear graffiti removes all decals.
8. Spray Mode OFF restores normal interaction.
9. Console logs clearly show picking and decal creation.
10. No blank screen, no broken imports.

## Priority

Prioritize a working visible result over a polished one.

First make a single large red decal appear on the bust.

Then make dragging create a spray trail.

Then restore nice colors/noisy spray style.
