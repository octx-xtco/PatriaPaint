# Artigas Canta

A Vite + Babylon.js interactive 3D web app featuring a bust of José Gervasio Artigas. The bust rotates with cursor movement, reacts to face dragging with elastic deformation, and sings Uruguayan patriotic songs with amplitude-based lipsync.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Run locally with collaborative mode

```bash
npm install
npm run dev:all
```

Open:

```text
http://localhost:5173
```

Turn on:

```text
Modo colaborativo
```

To test collaboration, open two browser windows with the same URL, activate collaborative mode in both, and select the same statue.

## How to use

- **Move your cursor** over the page to rotate the bust.
- **Click and drag** on the face to stretch it elastically — it springs back when released.
- Use the **song selector** to pick a patriotic song.
- Press **play** to start singing — the bust's mouth moves with the audio amplitude.
- Adjust **volume** with the slider.
- Click the **progress bar** to seek.

## Project structure

```
artigas-canta/
├── index.html
├── package.json
├── README.md
├── public/
│   ├── audio/          # Copied from Cancionero/
│   │   ├── mi-bandera.mp3
│   │   └── a-don-jose.mp3
│   ├── lipsync/        # Future phoneme/viseme JSON files
│   └── models/
│       └── artigas_bust.glb   # Real 3D bust (8.4 MB)
└── src/
    ├── main.js                 # Entry point (Babylon.js)
    ├── styles.css              # Dark UI styles
    ├── scene/
    │   ├── createScene.js      # Babylon.js scene, camera, lighting
    │   ├── loadBust.js         # GLB loader + inspection + placeholder
    │   ├── interaction.js      # Cursor-based rotation
    │   ├── elasticDeform.js    # Elastic face drag
    │   ├── audio.js            # Web Audio API playback
    │   └── lipsync.js          # Amplitude lipsync (morph → mesh → procedural)
    └── ui/
        └── controls.js         # Song selector, play/pause, volume, progress
```

## 3D Model

The real 3D bust model is at:

```
public/models/artigas_bust.glb
```

Copied from `3D/Meshy_AI_The_Resolute_General_0603014007_generate.glb` (8.4 MB).

**Model details:**
- Single mesh (`mesh_node`) with 245,975 vertices
- No morph targets — lipsync uses a procedural mouth
- Material adjusted to matte stone/plaster look
- Mouth position auto-detected from geometry

If the file is missing, the app creates a procedural placeholder bust with head, neck, shoulders, nose, eyes, mouth, hair, and military collar.

## Audio files

Audio files were copied from the local `Cancionero/` folder:

| File | Label |
|------|-------|
| `mi-bandera.mp3` | Mi Bandera |
| `a-don-jose.mp3` | A Don José |

Only existing files are included in the selector. No audio is fetched from the internet.

## How lipsync works

The lipsync system uses a **priority-based approach** (morph targets → mouth mesh → procedural mouth):

### 1. Morph target lipsync
If the GLB has morph targets named `mouthOpen`, `jawOpen`, `MouthOpen`, `viseme_A`, `viseme_O`, `viseme_M`, `viseme_aa`, or `open`, those are driven directly by the audio amplitude.

### 2. Mouth / jaw mesh lipsync
If a separate mesh is named `mouth`, `jaw`, `boca`, `mandibula`, `lips`, or `labio`, its vertical scale is animated.

### 3. Procedural mouth fallback (used by this model)
A dark oval disc (CircleGeometry) is attached to the front lower face and scaled vertically based on audio amplitude. The position and scale are tunable via constants:

```js
PROCEDURAL_MOUTH_OFFSET = { x: 0, y: 0.15, z: -0.55 }
PROCEDURAL_MOUTH_SCALE = { x: 0.22, y: 0.035, z: 1 }
```

**Audio analysis:** Web Audio API `AnalyserNode` reads time-domain data each frame, calculates RMS amplitude, smooths it, and maps it to a mouth-open value (0–0.8). The mouth closes smoothly when paused.

## GLB inspection

On load, the app logs detailed model info to the console:
- Mesh names and vertex counts
- Morph target names (if any)
- Mouth/jaw mesh detection
- Bounding box dimensions
- Mouth position auto-detection

## Adding phoneme/viseme JSON support

The lipsync module has hooks for future phoneme-driven animation:

1. Place a JSON file at `public/lipsync/<song-id>.json` with:
```json
[
  { "time": 0.12, "viseme": "A", "value": 0.8 },
  { "time": 0.25, "viseme": "O", "value": 0.5 }
]
```

2. Call `lipsyncSystem.loadVisemeData(data)` with the parsed JSON.
3. Call `lipsyncSystem.getVisemeFrame(time)` each frame.

## Tech stack

- [Vite](https://vitejs.dev/) — fast dev server and bundler
- [Babylon.js](https://www.babylonjs.com/) — 3D rendering engine
- Web Audio API — audio analysis and playback
- GLTF/GLB format — 3D model

## License

For educational and personal use only. Audio files are from publicly available sources and remain under their original licenses.
