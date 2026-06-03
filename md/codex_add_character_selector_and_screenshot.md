# Codex Task — Add 3D Character Selector and Screenshot Capture

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

Continue working on the existing “Artigas Canta” Babylon.js web app.

The current app loads a 3D bust/statue and allows spray graffiti painting on the actual 3D surface.

Now add two new features:

1. A character/statue selector that lets the user choose which 3D model to graffiti.
2. A capture button that saves a screenshot/photo of the current graffitied statue to the user’s computer.

Do not rewrite the whole app. Extend the existing codebase.

## Important browser limitation

A browser app cannot freely read arbitrary local folders at runtime.

So do not try to load directly from:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/3D`

inside browser code.

Instead, use the local `3D` folder as the source folder during development, and copy the selected `.glb` files into a web-accessible public folder.

Use this folder for web-accessible models:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/public/models/characters/
```

The browser should load models from paths like:

```text
/models/characters/artigas.glb
/models/characters/personaje-02.glb
/models/characters/personaje-03.glb
```

## Source model folder

The user will update this local folder with more 3D models:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/3D
```

Inspect this folder and find available `.glb` files.

Copy usable `.glb` files into:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/public/models/characters/
```

Do not delete or modify the originals in `/3D`.

If files have spaces or odd names, copy them with safe web filenames:

- lowercase
- hyphens or underscores
- no spaces
- `.glb` extension preserved

Example:

```text
Meshy_AI_The_Resolute_General_0603023818_generate.glb
```

could become:

```text
artigas.glb
```

If unsure, keep a readable safe name derived from the original.

## Model manifest

Create a model manifest file:

```text
public/models/characters/manifest.json
```

Example format:

```json
[
  {
    "id": "artigas",
    "name": "Artigas",
    "file": "/models/characters/artigas.glb"
  },
  {
    "id": "personaje-02",
    "name": "Personaje 02",
    "file": "/models/characters/personaje-02.glb"
  }
]
```

The app should read this manifest and populate a character/statue selector UI.

If generating the manifest automatically from the local folder is difficult in browser code, create/update it from the current available files manually in the project.

Important:

- Browser runtime reads `manifest.json`.
- Local folder inspection/copying happens during development, not in browser runtime.
- Keep this simple and reliable.

## Character selector UI

Add a small selector to the existing Spanish UI.

Suggested UI text:

```text
Estatua
Elegir estatua
```

The selector should:

- load options from `/models/characters/manifest.json`
- display human-readable character names
- default to Artigas or the first available model
- allow changing the active statue/model

When the user selects a different model:

1. Dispose the current model from the scene.
2. Dispose current graffiti decals.
3. Reset spray state.
4. Load the selected `.glb`.
5. Recenter and rescale the model.
6. Rebuild `paintableMeshes`.
7. Keep camera and lighting working.
8. Keep spray feature working on the new model.
9. Keep audio/UI features working.

## Model loading behavior

Refactor model loading if needed so it supports multiple models.

Suggested API:

```js
async function loadCharacterModel(character) {
  // character.file = "/models/characters/artigas.glb"
  // dispose previous root/model
  // load new GLB
  // normalize scale/position
  // return { root, meshes, paintableMeshes }
}
```

Do not duplicate loader logic everywhere.

## Recenter and rescale models

Different GLBs may have different sizes/origins.

After loading each model:

- compute bounding box
- center model around the scene origin
- place base around y = 0 if possible
- scale to a consistent height
- update camera target to the model center
- update camera radius if needed

Target behavior:

- every statue appears centered
- every statue fits nicely in frame
- user does not have to manually find it
- spray raycasting works after model switch

Suggested target height:

```js
const TARGET_MODEL_HEIGHT = 2.6;
```

Adjust if the current app uses another scale.

## Paintable meshes after model switch

After each model loads, rebuild paintable meshes.

Use a practical filter:

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

Make sure each paintable mesh has:

```js
mesh.isPickable = true;
```

When switching models, update the graffiti system with the new paintable meshes.

Do not keep references to old disposed meshes.

## Graffiti behavior on model switch

When the user changes statue/model:

- clear existing decals
- dispose existing decals
- reset `sprayDecals`
- reset last paint point / stroke state
- rebuild paintable meshes for the new model
- keep cached spray materials/textures if safe
- do not allow old paint from a previous statue to float in the scene

## Screenshot / capture feature

Add a capture button to the UI.

Suggested UI text:

```text
Sacar foto
```

When clicked:

- render the current scene
- include the current statue
- include graffiti decals
- include current camera view
- ideally exclude UI overlay from the screenshot
- save/download a PNG image to the user’s computer

Suggested filename:

```text
artigas-graffiti-YYYYMMDD-HHMMSS.png
```

or:

```text
graffiti-estatua-YYYYMMDD-HHMMSS.png
```

## Babylon screenshot implementation

Use Babylon.js screenshot tools if available.

For example, use something like:

```js
BABYLON.Tools.CreateScreenshotUsingRenderTarget(
  engine,
  camera,
  { width: 1920, height: 1080 },
  (data) => {
    // create download link
  }
);
```

If the exact API differs for the installed Babylon version, use the correct Babylon screenshot/canvas capture API.

Alternative:

```js
const dataURL = canvas.toDataURL("image/png");
```

But prefer a render-target screenshot if it gives better quality.

Important:

- Make sure the screenshot includes transparent decals / graffiti.
- Do not capture the HTML UI panel unless the simple canvas method makes that unavoidable.
- If using canvas capture, ensure `preserveDrawingBuffer` is enabled if needed.
- Do not break rendering performance permanently just for screenshots.

## Engine option for screenshots

If needed, set Babylon engine creation with:

```js
const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true
});
```

Only change engine initialization if necessary.

If changing this hurts performance, prefer Babylon’s render-target screenshot helper.

## Download behavior

Create a download helper:

```js
function downloadDataURL(dataURL, filename) {
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
```

The user should be able to click `Sacar foto` and get a PNG file saved/downloaded.

## UI layout

Add the new controls to the existing panel without cluttering it.

Suggested sections:

```text
Estatua
[selector]

Graffiti
[Modo spray]
[colores]
[tamaño]
[Limpiar pintura]

Captura
[Sacar foto]
```

Keep all visible UI text in Spanish.

## Performance considerations

Character switching and screenshots should not make the app slow.

Make sure to:

- dispose old model meshes/materials only if safe
- dispose old decals on character change
- rebuild paintable meshes once per model load, not every frame
- do not rescan all scene meshes while painting
- do not create screenshot render targets repeatedly unless needed
- keep debug logs minimal

## Error handling

If manifest loading fails:

- log the error
- fallback to the current default model if available
- keep the app running

If a selected model fails to load:

- show a console error
- keep previous model if possible
- do not leave blank scene

If no models are found:

- show a clear UI message:
  - `No hay modelos disponibles.`
- keep the app stable

## Final verification

Run:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm run build
npm run preview
```

Then verify:

1. App loads without errors.
2. Character selector appears.
3. Selector is populated from `manifest.json`.
4. Default model loads.
5. Spray still works on the default model.
6. Selecting another model disposes the old one and loads the new one.
7. New model is centered and scaled correctly.
8. Spray works on the newly selected model.
9. Old graffiti does not remain floating after model switch.
10. `Limpiar pintura` still works.
11. `Sacar foto` downloads a PNG.
12. The PNG includes the statue and graffiti.
13. Camera/cursor interaction still works when Spray Mode is off.
14. Spray Mode still freezes camera/model interaction while painting.
15. No blank screen.
16. No broken imports.
17. No console errors.

## Expected result

The app becomes a multi-statue graffiti tool:

- the user can choose which 3D statue/personaje to load
- the user can graffiti the selected statue
- the user can clear graffiti
- the user can take/download a screenshot of the result
