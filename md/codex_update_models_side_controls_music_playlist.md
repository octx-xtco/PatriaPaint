# Codex Task — Update Models, Side Controls, and Music Playlist Behavior

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

Work on the existing “Artigas Canta” Babylon.js web app.

Do not rewrite the app from scratch. Inspect the existing project and update only what is needed.

## Goals

Make these updates:

1. Update the 3D model list using the `.glb` files currently inside:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/3D
```

2. Move the UI controls to one side of the screen so they do not interfere with the bust.

3. Update the music/cancionero using the audio files currently inside:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/Cancionero 
```

Important: the `Cancionero ` folder path may contain a trailing space after the word `Cancionero`. Handle it carefully.

4. Change the music UI/logic:

- remove the song dropdown
- music should always be available/playing after user interaction
- user can mute/unmute
- user can skip to the next song
- user cannot pause
- user cannot manually choose a song

## 1. Update model list from `/3D`

The source folder for 3D models is:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/3D
```

Inspect this folder and find all usable `.glb` files.

Copy them into the web-accessible folder:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/public/models/characters/
```

Do not delete or modify the originals.

If file names contain spaces or strange characters, copy them using safe web filenames:

- lowercase
- hyphens or underscores
- no spaces
- `.glb` extension preserved

Then update:

```text
public/models/characters/manifest.json
```

The manifest should include every `.glb` currently found in `/3D`.

Example:

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

If the app already has a model selector, keep it working but repopulate it from the updated manifest.

When switching models:

- dispose the previous model
- clear current graffiti decals
- reset spray state
- load the selected model
- recenter and rescale it
- rebuild paintable meshes
- keep spray working on the new model

## 2. Move controls to the side

Move all UI controls to a side panel so they do not cover the bust.

Preferred layout:

- fixed left side panel, or fixed right side panel
- vertical layout
- compact controls
- dark translucent background
- white/light text
- thin border
- small type
- should not block the central bust

Suggested CSS behavior:

```css
.controls-panel {
  position: fixed;
  top: 24px;
  left: 24px;
  width: 260px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  z-index: 10;
}
```

If left side interferes with the bust, use right side instead.

The bust should remain visually centered in the main canvas.

Make sure the UI panel does not capture pointer events outside itself.

## 3. Update cancionero from folder

The source folder for music is:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/Cancionero 
```

Again: the folder may have a trailing space.

Inspect this folder and find audio files:

- `.mp3`
- `.wav`
- `.m4a`
- `.ogg`

Copy them into:

```text
/Users/octaviotarigo/Desktop/APPS/ArtigasMesh/public/audio/
```

Use safe web filenames:

- lowercase
- hyphens or underscores
- no spaces

Create or update an audio manifest:

```text
public/audio/manifest.json
```

Example:

```json
[
  {
    "id": "himno-nacional",
    "name": "Himno Nacional",
    "file": "/audio/himno-nacional.mp3"
  },
  {
    "id": "a-don-jose",
    "name": "A Don José",
    "file": "/audio/a-don-jose.mp3"
  }
]
```

The app should load the audio playlist from this manifest.

## 4. New music behavior

Remove the song dropdown/select UI.

The music system should behave like a simple playlist/radio.

Visible UI should include only:

```text
Música
Mute / Sonido
Siguiente tema
Tema actual: [name]
```

Behavior:

- no dropdown
- no manual song selection
- no pause button
- no stop button
- user can mute/unmute
- user can skip to next song
- when a song ends, automatically advance to the next song
- when it reaches the last song, loop back to the first
- the current song name should be displayed
- volume can remain if it already exists, but mute/unmute is the main control

Important browser autoplay rule:

Audio cannot autoplay before user interaction.

So implement this behavior:

- On first user interaction with the page, initialize/resume the AudioContext and start playlist playback.
- If autoplay is blocked, show a small button:
  - `Activar música`
- After activation, music should continue playing automatically through the playlist.
- Muting should set volume to zero or `audio.muted = true`, but the track should keep progressing.
- Unmuting restores sound.
- `Siguiente tema` skips to the next song and starts playing it.

Do not create multiple audio elements.

Use one persistent audio element and update its `src`.

Do not create multiple `MediaElementSourceNode` instances for the same audio element.

When changing tracks:

```js
audioElement.pause();
audioElement.src = nextTrack.file;
audioElement.load();
audioElement.currentTime = 0;
await audioElement.play();
```

Make sure the analyser/lipsync, if present, still connects to the same persistent audio element.

## UI sections

The side panel should be organized like this:

```text
Artigas Canta

Estatua
[model selector]

Graffiti
[Modo spray]
[color buttons]
[size slider]
[Limpiar pintura]

Música
[Tema actual]
[Mute / Sonido]
[Siguiente tema]

Captura
[Sacar foto]
```

Keep UI text in Spanish.

## Preserve existing features

Do not break:

- Babylon.js rendering
- model loading
- character selector
- spray mode
- graffiti accumulation
- clear graffiti
- screenshot capture
- camera/orbit behavior when Spray Mode is off
- frozen camera/model behavior when Spray Mode is on

## Final verification

Run:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm run build
npm run preview
```

Verify:

1. App loads.
2. Side controls appear and do not block the bust.
3. Model selector lists every `.glb` from `/3D`.
4. Selecting a model loads it correctly.
5. Spray still works on selected models.
6. Music playlist loads from `Cancionero`.
7. No song dropdown exists.
8. Music can be activated after user interaction.
9. Mute/unmute works.
10. Next track works.
11. Songs auto-advance and loop.
12. Current song name displays correctly.
13. Screenshot capture still works.
14. No blank screen.
15. No broken imports.
16. No console errors.
