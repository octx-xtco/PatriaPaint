# Codex Task — Simplify Collaborative Mode Startup

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

The collaborative Socket.IO mode is working, but currently it requires two separate terminal commands:

```bash
npm run server
npm run dev
```

I want the app to be easier to run.

## Goal

Make collaborative mode easy to start with a single command during development.

The desired local workflow should be:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm run dev:all
```

This should start both:

- the Vite frontend
- the Socket.IO server

Then the user should open:

```text
http://localhost:5173
```

and activate:

```text
Modo colaborativo
```

from the UI.

## Required changes

### 1. Add `concurrently`

Add `concurrently` as a dev dependency if it is not already installed.

```bash
npm install -D concurrently
```

### 2. Update `package.json` scripts

Keep the existing scripts, but make sure these exist:

```json
{
  "scripts": {
    "dev": "vite",
    "server": "node server/index.js",
    "dev:all": "concurrently \"npm run server\" \"npm run dev\""
  }
}
```

If `server` or `dev` already exist, do not duplicate them. Just make sure they work.

The important part is that this command works:

```bash
npm run dev:all
```

and starts both processes.

### 3. Make the socket URL configurable

Make sure the frontend Socket.IO client connects to the correct local socket server.

Use a clear constant, for example:

```js
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
```

or:

```js
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://127.0.0.1:3001";
```

Use this value in the socket client module.

Likely file:

```text
src/network/collaboration.js
```

Do not hardcode the URL in multiple places.

### 4. Add `.env.example`

Add a file:

```text
.env.example
```

with:

```env
VITE_SOCKET_URL=http://localhost:3001
```

This is only for clarity. The app should still work without a `.env` file because the fallback URL exists.

### 5. Add simple usage instructions

Update `README.md` or create a short section in the existing documentation.

Add:

```md
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
```

## Optional production-style mode

If it can be implemented safely, also add a production-style workflow where one Node server serves both:

- built frontend
- Socket.IO server

Desired future workflow:

```bash
npm run build
npm start
```

Then open:

```text
http://localhost:3001
```

In this mode, the same Node server should:

- serve the built frontend from `dist/`
- run Socket.IO
- use one port only

If implementing this now is safe:

1. Add Express if needed:

```bash
npm install express
```

2. Update `server/index.js` to serve `dist/` when it exists.

3. Add this script:

```json
{
  "scripts": {
    "start": "node server/index.js"
  }
}
```

Important:

- Do not break `npm run dev`.
- Do not break `npm run server`.
- Do not break `npm run dev:all`.
- If production serving becomes messy, skip it and only implement `dev:all`.

## Expected usage after this task

For development:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm run dev:all
```

Open:

```text
http://localhost:5173
```

For testing collaborative mode:

1. Open two browser windows.
2. Go to `http://localhost:5173` in both.
3. Activate `Modo colaborativo` in both.
4. Select the same statue.
5. Paint in one window.
6. Confirm the paint appears in the other window.

## Preserve existing features

Do not break:

- Babylon.js rendering
- model selector
- low-poly model loading
- spray mode
- local painting
- collaborative painting
- per-statue socket rooms
- clear graffiti
- screenshot capture
- side controls
- music playlist
- mute/unmute
- next track
- disabled lipsync state
- lighting setup

## Final verification

Run:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm run dev:all
```

Verify:

1. Socket.IO server starts.
2. Vite frontend starts.
3. App opens at `http://localhost:5173`.
4. `Modo colaborativo` connects.
5. Two browser windows on the same statue sync paint.
6. Different statues do not share paint.
7. Clear graffiti works in collaborative mode.
8. Local mode still works when collaborative mode is off.
9. No blank screen.
10. No broken imports.
11. No console errors.

If production serving is implemented, also verify:

```bash
npm run build
npm start
```

Then open:

```text
http://localhost:3001
```

and confirm collaborative mode still works.

## Expected result

The app should no longer require manually running two separate terminal commands during development.

The new simple workflow should be:

```bash
npm run dev:all
```

Then open:

```text
http://localhost:5173
```

and activate collaborative mode from the UI.
