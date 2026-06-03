# Hermes Agent Prompt — Artigas Canta

You are Hermes Agent using DeepSeek.

Your task is to build a complete Vite + Three.js web app called “Artigas Canta”.

The app should be created inside this folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

If the folder already exists, inspect it first and preserve any existing useful assets.

The final app should be a single-page interactive 3D experience featuring a bust of José Gervasio Artigas on a pure black background. The bust should rotate subtly with the cursor, react to face dragging with an elastic/rubbery interaction, and sing selected Uruguayan patriotic songs using audio-reactive lipsync.

I will provide reference images of Artigas separately. Use them as the main visual reference for the bust.

## Main goal

Create a polished web app where:

- A 3D bust/head of José Gervasio Artigas is centered on a black background.
- The bust rotates smoothly according to cursor position.
- The user can drag the face and get an elastic face interaction inspired by Adult Swim’s “Elastic Man”, but do not copy its code or assets.
- The user can choose a patriotic Uruguayan song.
- Artigas performs lipsync driven by the audio amplitude.
- The interface is minimal, dark, and in Spanish.

## Project stack

Use:

- Vite
- Three.js
- JavaScript
- GLTFLoader
- Web Audio API
- Raycaster
- Pointer events

Do not use React unless absolutely necessary.

The app must run with:

```bash
npm install
npm run dev
```

## Project location

Create or use this project directory:

```bash
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh
```

Inside that folder, create a clean project structure:

```text
src/
  main.js
  scene/
    createScene.js
    loadBust.js
    interaction.js
    elasticDeform.js
    lipsync.js
    audio.js
  ui/
    controls.js
  styles.css

public/
  models/
    artigas_bust.glb
  audio/
```

Also create:

```text
index.html
package.json
README.md
```

## Audio source folder

The patriotic songs are already stored locally here:

```bash
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/Cancionero 
```

Important: the folder name may contain a trailing space after `Cancionero`. Handle this carefully.

Inspect this folder and find available audio files.

Copy the audio files into:

```bash
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/public/audio/
```

Use the copied files from `/public/audio/` as the web-accessible sources.

Do not fetch audio from the internet.

Do not bundle copyrighted recordings unless properly licensed.

If filenames are different from the expected names, map the actual files to clean web-safe filenames.

Expected final audio paths should preferably be:

```text
/public/audio/himno-nacional.mp3
/public/audio/mi-bandera.mp3
/public/audio/a-don-jose.mp3
/public/audio/la-redota.mp3
```

If only some songs exist, include only the available songs in the selector and do not break the app.

## Visual reference for Artigas

Use the provided reference images to create or guide the bust.

The bust should represent José Gervasio Artigas with these recognizable traits:

- long, austere face
- prominent straight nose
- deep-set eyes
- strong brow
- thin serious mouth
- marked cheekbones
- firm jawline
- combed-back hair
- solemn and severe expression
- patriotic sculptural iconography
- bust format, not full body
- high military collar or sculptural base if appropriate

Avoid making him look generic, cartoonish, or like a random historical general.

The result should feel like a stylized but recognizable Artigas based on traditional Uruguayan historical iconography and sculptural busts.

## 3D model handling

Assume the main GLB model will be located here:

```text
/public/models/artigas_bust.glb
```

If the file does not exist, create a placeholder bust using Three.js geometry so the app still runs.

The placeholder should include:

- head
- neck
- shoulders or bust base
- approximate nose
- simple eyes
- simple mouth area
- sculptural material

Log clearly:

```js
console.warn("Missing artigas_bust.glb, using placeholder geometry.");
```

The code should make it easy to replace the placeholder with a real GLB later.

## Background and lighting

Use:

- pure black background
- one centered bust
- no environment
- no decorative elements
- cinematic lighting
- soft key light
- subtle rim light
- very subtle fill light
- sculptural material such as plaster, stone, wax, or dark bronze

The page should feel dark, solemn, weird, patriotic, and slightly absurd.

## Cursor rotation

Implement smooth cursor-based rotation.

Behavior:

- horizontal cursor position rotates the bust on the Y axis
- vertical cursor position rotates the bust slightly on the X axis
- movement should be smooth and damped
- not too fast
- not too exaggerated
- when cursor is idle, the bust should ease subtly back toward center

Do not rely on OrbitControls as the main interaction. Custom cursor rotation is preferred.

## Elastic face interaction

Implement a simplified elastic face drag interaction.

Goal:

When the user clicks/touches the face and drags, the clicked area should stretch toward the pointer, then spring back when released.

Implementation approach:

- use Raycaster to detect the clicked point on the bust/head mesh
- store original vertex positions
- deform nearby vertices around the hit point
- use a falloff radius
- strongest movement at the grabbed point
- deformation fades outward
- clamp maximum displacement
- add spring recovery
- keep it stable and subtle

If the GLB contains multiple meshes, attempt to apply deformation only to the largest head/face mesh.

If real vertex deformation becomes unstable, use a fake but visually convincing fallback:

- slight squash/stretch on the head
- subtle head pull toward cursor
- small jaw/mouth scaling
- temporary procedural deformation

Stable interaction is more important than perfect soft-body physics.

## Touch support

Use pointer events:

- pointerdown
- pointermove
- pointerup
- pointercancel

The app should work with mouse and touch.

## Songs UI

Create a minimal dark floating control panel in Spanish.

The panel should include:

- title: `Artigas Canta`
- song selector
- play/pause button
- volume slider
- progress bar
- instruction text: `Arrastrá la cara con el cursor.`

Style:

- small
- elegant
- translucent black or dark gray
- white text
- thin border
- clean typography
- positioned bottom-left or bottom-center
- should not distract from the bust

## Song selector

Include these song labels if the files exist:

```text
Himno Nacional
Mi Bandera
A Don José
La Redota
```

Behavior:

- selecting a new song stops the current one
- loads the selected audio
- updates title/display
- play/pause works
- volume slider works
- progress bar updates
- audio should not autoplay without user interaction

## Lipsync

Implement amplitude-based lipsync using Web Audio API.

Use:

- AudioContext
- MediaElementSource
- AnalyserNode
- frequency/time-domain analysis
- smoothed amplitude calculation

Drive the mouth animation with the audio amplitude.

Mouth animation priority:

### 1. Morph targets

If the GLB has morph targets named:

```text
mouthOpen
jawOpen
viseme_A
viseme_O
viseme_M
viseme_aa
MouthOpen
```

drive those morph targets using the audio amplitude.

### 2. Mouth or jaw mesh

If the GLB has a named mouth/jaw object such as:

```text
mouth
jaw
boca
mandibula
```

animate its rotation, translation, or scale.

### 3. Procedural mouth fallback

If there are no morph targets or mouth meshes, create a procedural black mouth shape attached to the front of the face.

Use:

- small dark oval or rounded plane
- positioned approximately where the mouth should be
- vertical scale driven by amplitude
- slightly uncanny but visually clean

Lipsync behavior:

- smooth amplitude response
- avoid jitter
- close mouth when paused or stopped
- slight idle movement while song is playing quietly
- mildly exaggerated motion for comic effect

## Future lipsync support

Prepare the code so future phoneme/viseme JSON support can be added later.

Example future file:

```text
/public/lipsync/himno-nacional.json
```

Example structure:

```json
[
  { "time": 0.12, "viseme": "A", "value": 0.8 },
  { "time": 0.25, "viseme": "O", "value": 0.5 }
]
```

Do not implement full phoneme parsing now, but create clear hooks/functions for later.

## Code quality

Write clean modular code.

Suggested modules:

```text
src/main.js
src/scene/createScene.js
src/scene/loadBust.js
src/scene/interaction.js
src/scene/elasticDeform.js
src/scene/lipsync.js
src/scene/audio.js
src/ui/controls.js
src/styles.css
```

Keep logic separated:

- scene setup
- model loading
- interaction
- deformation
- audio
- lipsync
- UI

## Performance

Requirements:

- efficient render loop
- avoid unnecessary allocations per frame
- clamp deformation strength
- limit deformation radius
- recompute normals only when needed
- throttle expensive geometry updates if necessary
- should run smoothly on a modern Mac laptop/browser

## README

Create a README explaining:

1. how to install dependencies
2. how to run the project
3. where to place the GLB model
4. where the audio files are copied from
5. how the song selector works
6. how amplitude-based lipsync works
7. how to replace the placeholder bust
8. how future phoneme/viseme JSON support could be added

## Implementation order

Work in this exact order:

1. Inspect the project folder.
2. Create or update the Vite project.
3. Create the Three.js scene with black background.
4. Load `/public/models/artigas_bust.glb` if available.
5. If missing, create the placeholder bust.
6. Implement lighting and camera.
7. Implement cursor-based rotation.
8. Inspect and copy audio files from `/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/Cancionero ` to `/public/audio/`.
9. Build the UI controls.
10. Implement audio playback.
11. Implement amplitude-based lipsync.
12. Implement elastic drag interaction.
13. Add touch support.
14. Write README.
15. Run the project and fix errors.

## Important constraints

- Do not download audio from the internet.
- Do not scrape assets.
- Do not copy Adult Swim code.
- Do not overengineer the elastic simulation.
- A stable working prototype is better than a broken advanced effect.
- Keep the page visually minimal and dark.
- Use Spanish for visible UI text.
- Use English for code comments and README unless the UI text is user-facing.

## Failure handling

If any part of the advanced interaction becomes unstable, simplify it immediately and keep the app running.

Do not leave:

- broken imports
- missing files
- non-running code
- unhandled audio errors
- blank screen
- uncaught runtime errors

The final priority is a working local prototype.

## Final expected result

A working Vite + Three.js app where José Gervasio Artigas appears as a dark 3D singing bust on a black background.

The bust should:

- rotate with cursor movement
- react to face dragging
- sing selected patriotic songs
- perform lipsync from audio amplitude
- have a minimal Spanish control panel
- be ready to replace the placeholder bust with a proper GLB model
