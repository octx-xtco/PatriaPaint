# Codex Task — Update Character Models from LowPoly Folder

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

Work on the existing “Artigas Canta” Babylon.js web app.

Do not rewrite the app. Only update the model/character list so the app uses the optimized low-poly GLB models.

## Goal

Update the app’s available 3D statue/character models using the files currently inside:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/3D/LowPoly
```

These are the new optimized models that should be used in the web app.

## Source folder

The source folder for the current low-poly models is:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/3D/LowPoly
```

Inspect this folder and find all usable `.glb` files.

## Destination folder

Copy the `.glb` files into the web-accessible characters folder:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/public/models/characters/
```

Do not delete or modify the original files in `3D/LowPoly`.

If the destination folder already contains older model files, keep only the current low-poly models in the manifest. You do not necessarily need to delete old files, but the app should list and use only the models from `3D/LowPoly`.

## Safe filenames

If source filenames contain spaces, uppercase letters, accents, or strange characters, copy them with safe web filenames:

- lowercase
- no spaces
- use hyphens or underscores
- preserve `.glb`
- avoid accents in the filename

Example:

```text
José Batlle Low Poly.glb
```

should become:

```text
jose-batlle-low-poly.glb
```

## Update manifest

Update this manifest:

```text
public/models/characters/manifest.json
```

The manifest should include every `.glb` currently found in:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/3D/LowPoly
```

The manifest should NOT list old high-poly models from the previous `/3D` folder unless they are also present in `/3D/LowPoly`.

Example format:

```json
[
  {
    "id": "artigas",
    "name": "Artigas",
    "file": "/models/characters/artigas.glb"
  },
  {
    "id": "rivera",
    "name": "Rivera",
    "file": "/models/characters/rivera.glb"
  },
  {
    "id": "batlle-y-ordonez",
    "name": "Batlle y Ordóñez",
    "file": "/models/characters/batlle-y-ordonez.glb"
  }
]
```

If names cannot be inferred perfectly, create readable names from the filenames.

## Preserve existing app behavior

Do not break:

- model selector
- model loading
- model centering/rescaling
- spray graffiti
- persistent graffiti
- clear graffiti
- screenshot capture
- music playlist
- side UI panel
- camera/orbit behavior when Spray Mode is off
- frozen camera/model behavior when Spray Mode is on

## Model switching behavior

When the user selects a model:

- dispose the previous model
- clear current graffiti decals
- reset spray state
- load the selected low-poly GLB
- recenter and rescale the model
- rebuild paintable meshes
- keep spray working on the new model

## Verification

Run:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm run build
npm run preview
```

Then verify:

1. App loads.
2. Model selector lists only models from `3D/LowPoly`.
3. Each listed model loads correctly.
4. Models are centered and scaled properly.
5. Spray still works on each model.
6. Clear graffiti still works.
7. Screenshot capture still works.
8. Music playlist still works.
9. No old high-poly models are listed unless they are present in `3D/LowPoly`.
10. No blank screen.
11. No broken imports.
12. No console errors.

## Expected result

The app now uses the optimized low-poly models from:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/3D/LowPoly
```

instead of the older high-poly models.
