# Codex Task — Add Collaborative Socket Painting Mode

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

Work on the existing “Artigas Canta” Babylon.js web app.

The app currently supports:

- multiple selectable 3D statue models
- spray painting on the actual 3D model surface using Babylon.js decals
- persistent local graffiti
- clear graffiti
- screenshot capture
- music playlist
- side UI controls

Now add a collaborative painting mode using sockets.

Do not rewrite the app. Extend the existing codebase carefully.

## Main goal

Add a toggleable collaborative mode.

When collaborative mode is ON, multiple users can paint the same selected statue in real time.

Important: users do not all need to paint the same statue globally.

Each statue/model has its own collaborative room.

Example:

- users viewing Artigas paint together in room `statue:artigas`
- users viewing Rivera paint together in room `statue:rivera`
- users viewing Batlle paint together in room `statue:batlle-y-ordonez`

When a user changes statue, they leave the previous statue room and join the new one.

## Behavior

### Collaborative Mode OFF

- app works locally only
- user can paint normally
- no socket connection required
- no paint events are sent
- no remote paint events are received

### Collaborative Mode ON

- app connects to a socket server
- app joins a room based on the current statue/model id
- local paint strokes are sent to other users in the same statue room
- remote paint strokes from other users are recreated locally as decals
- changing statue switches socket rooms
- clearing graffiti can optionally clear only the current statue room

## Technical choice

Use Socket.IO.

Add dependencies if needed:

```bash
npm install socket.io socket.io-client
```

Create a minimal socket server in the project, for example:

```text
server/index.js
```

The Vite client remains the frontend.

The socket server should run separately, for example:

```bash
node server/index.js
```

Or add package scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "server": "node server/index.js",
    "dev:all": "concurrently \"npm run server\" \"npm run dev\""
  }
}
```

If adding `concurrently`, install it.

## Socket server

Create a minimal Socket.IO server.

Events:

```text
joinStatue
leaveStatue
sprayDecal
clearGraffiti
requestState
stateSnapshot
userCount
```

Room naming:

```js
const roomName = `statue:${statueId}`;
```

When a client joins a statue:

- leave previous statue room if any
- join new statue room
- update user count for that room
- optionally send existing room graffiti state

## State persistence

Keep simple in-memory state on the server.

For each statue room, store recent/current paint decals.

Example:

```js
const roomState = new Map();
// key: statueId
// value: array of decal events
```

When a user paints:

- server receives `sprayDecal`
- server appends it to that statue’s state
- server broadcasts it to all other users in that room

When a user joins a statue room:

- server sends existing decals for that statue using `stateSnapshot`

When a user clears graffiti:

- server clears that statue’s room state
- broadcasts `clearGraffiti` to users in that room

Important: cap server-side stored decals per statue to avoid memory blowup.

Example:

```js
const MAX_SERVER_DECALS_PER_STATUE = 2000;
```

If exceeded, either stop storing new decals or drop oldest server-side events. But do not break client painting.

## Client socket module

Create a new module:

```text
src/network/collaboration.js
```

Suggested API:

```js
export function createCollaborationSystem({
  getCurrentStatueId,
  onRemoteSprayDecal,
  onRemoteClearGraffiti,
  onStateSnapshot,
  onUserCount
}) {
  return {
    connect(),
    disconnect(),
    setEnabled(enabled),
    joinStatue(statueId),
    leaveCurrentStatue(),
    sendSprayDecal(payload),
    sendClearGraffiti(statueId),
    isEnabled()
  };
}
```

## UI

Add a small section to the side UI panel:

```text
Colaborativo
[Modo colaborativo ON/OFF]
Usuarios en esta estatua: 3
Estado: conectado / desconectado
```

Keep UI text in Spanish.

When collaborative mode is OFF:

```text
Estado: local
```

When ON and connected:

```text
Estado: conectado
```

When ON but server is unavailable:

```text
Estado: sin conexión
```

## Sending paint events

When the user paints locally and creates a decal, also send a compact payload if collaborative mode is ON.

Do not send Babylon mesh objects or decal objects.

Send only serializable data:

```js
{
  statueId,
  meshName,
  point: { x, y, z },
  normal: { x, y, z },
  color,
  size,
  angle,
  timestamp
}
```

If possible, include enough data to recreate the decal remotely.

Do not send huge arrays, textures, materials, or binary mesh data.

## Receiving paint events

When the client receives a remote `sprayDecal` event:

- check it belongs to the currently selected statue
- find the matching paintable mesh by `meshName`
- if the mesh name is unavailable or does not match, fallback to the largest paintable mesh
- recreate the decal locally using the received point, normal, color, size, and angle
- mark it as remote if useful
- make sure remote decals are non-pickable

Important:

Do not re-emit remote decals back to the socket. Avoid feedback loops.

## Local vs remote paint

The local user should see their own paint immediately, without waiting for the server.

Flow:

```text
local pointer event
→ create local decal immediately
→ send compact spray event through socket
→ other users receive and recreate it
```

When receiving from server:

```text
remote event
→ create remote decal locally
→ do not send again
```

## Throttling network events

Do not emit every single microdecal if the spray system creates many decals.

Throttle socket sending.

Example:

```js
const NETWORK_SPRAY_INTERVAL_MS = 50;
```

The local spray can remain visually dense, but network events should be limited.

If the current spray creates interpolated decals, either:

- send only a subset of decals, or
- batch several decals into one socket event.

Batch option:

```js
{
  statueId,
  decals: [
    { meshName, point, normal, color, size, angle },
    { meshName, point, normal, color, size, angle }
  ]
}
```

Keep it simple. Prioritize stability.

## Statue switching

When the selected statue/model changes:

If collaborative mode is ON:

1. leave previous statue room
2. clear local graffiti for previous model as currently done
3. load new model
4. rebuild paintable meshes
5. join new statue room
6. request/receive state snapshot for the new statue
7. recreate existing remote decals for that statue

If collaborative mode is OFF:

- keep current local behavior

## Clear graffiti behavior

When collaborative mode is OFF:

- `Limpiar pintura` clears only local decals

When collaborative mode is ON:

- `Limpiar pintura` clears local decals
- sends `clearGraffiti` for the current statue room
- all users in the same statue room clear their graffiti

Do not clear other statue rooms.

## Robustness

If socket server is unavailable:

- app should still run
- collaborative mode should show disconnected/error state
- local spray should still work
- no blank screen
- no broken imports

If a user toggles collaborative mode OFF:

- disconnect or stop sending/receiving events
- leave current room
- keep local painting functional

## Security / sanity

Validate incoming events lightly:

- ignore events without `statueId`
- ignore events without valid point/normal
- ignore events for a different current statue
- clamp size to reasonable values
- ignore unknown colors only if necessary

## Preserve existing features

Do not break:

- Babylon.js rendering
- low-poly model loading
- model selector
- spray mode
- persistent local graffiti
- clear graffiti
- screenshot capture
- side controls
- music playlist
- mute/unmute
- next track
- lighting improvements
- disabled lipsync state
- camera/orbit behavior when Spray Mode is off
- frozen camera/model behavior when Spray Mode is on

## Final verification

Run the socket server and app.

Suggested:

```bash
cd /Users/octaviotarigo/Desktop/APPS/ArtigasMesh
npm run server
npm run dev
```

Or, if a combined script exists:

```bash
npm run dev:all
```

Open the app in two browser windows.

Verify:

1. App loads in both windows.
2. Collaborative mode can be toggled ON.
3. Both users on the same statue see each other’s paint.
4. Painting appears immediately for local user.
5. Remote paint appears in the other window.
6. Users on different statues do not share paint.
7. Switching statue changes socket room.
8. Existing paint for that statue can be restored via state snapshot.
9. Clear graffiti clears only the current statue room.
10. Turning collaborative mode OFF stops network sync but local spray still works.
11. If server is stopped, app still works locally.
12. No blank screen.
13. No broken imports.
14. No console errors.

## Expected result

The app gains a collaborative mode:

- local mode works as before
- collaborative mode syncs graffiti in real time
- each statue/model has its own painting room
- multiple users can intervene the same statue together
- users on different statues can paint independently
