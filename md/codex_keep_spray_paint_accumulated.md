# Codex Task — Keep Spray Paint Accumulated on the 3D Bust

Project folder:

`/Users/octaviotarigo/Desktop/APPS/ArtigasMesh`

The spray paint feature now works, but there is a problem:

When the user keeps painting, older paint marks disappear. It looks like the app is deleting older decals as new decals are created.

This is probably caused by a `MAX_DECALS` limit that disposes the oldest decals when the limit is reached.

We need to change this behavior.

## Goal

Spray paint should remain accumulated on the 3D bust.

When the user paints more, previous paint should stay visible.

The bust should progressively accumulate graffiti instead of replacing old paint.

## Current problem

Current behavior:

- user paints on the bust
- paint appears
- user continues painting
- after some time, older paint disappears
- the graffiti does not feel permanent

Desired behavior:

- user paints on the bust
- paint appears
- user continues painting
- previous paint remains visible
- new paint accumulates on top / alongside older paint
- only the `Limpiar pintura` button should remove paint

## Important constraints

- Keep Babylon.js.
- Keep painting on the actual 3D bust surface.
- Do not switch to a 2D overlay.
- Do not rewrite the app.
- Do not modify the original GLB.
- Keep Spray Mode behavior.
- Keep camera/cursor interaction when Spray Mode is off.
- Keep Clear Graffiti working.
- Avoid making the app very slow again.

## Required change

Find the code that does something like:

```js
while (sprayDecals.length > MAX_DECALS) {
  const oldDecal = sprayDecals.shift();
  oldDecal?.dispose();
}
```

or:

```js
if (sprayDecals.length > MAX_DECALS) {
  sprayDecals.shift().dispose();
}
```

Do not automatically delete old paint decals during normal painting.

Only delete paint when the user clicks:

```text
Limpiar pintura
```

## New behavior

Remove or disable automatic disposal of old decals during painting.

Instead of removing old decals immediately, implement a safer accumulation strategy.

Preferred:

```js
const MAX_DECALS = 2000;
const DELETE_OLD_DECALS_AUTOMATICALLY = false;
```

When `DELETE_OLD_DECALS_AUTOMATICALLY` is false:

- do not dispose old decals
- let paint accumulate
- show current decal count in debug/performance panel if available

## Performance protection

Since accumulated decals can become heavy, add a warning threshold instead of deleting automatically.

Example:

```js
const DECAL_WARNING_THRESHOLD = 1500;
```

If the decal count exceeds this number:

- do not delete decals automatically
- show a subtle UI warning or console warning once:
  - `Muchos trazos de pintura pueden bajar el rendimiento. Usá "Limpiar pintura" para resetear.`
- do not spam the console every frame

Example:

```js
if (
  sprayDecals.length > DECAL_WARNING_THRESHOLD &&
  !hasShownDecalWarning
) {
  console.warn('Many spray decals are active. Performance may decrease. Use "Limpiar pintura" to reset.');
  hasShownDecalWarning = true;
}
```

## Optional manual cleanup button

Keep the existing:

```text
Limpiar pintura
```

This should still:

- dispose all decals
- empty `sprayDecals`
- reset warning state
- not reload the model

Example:

```js
function clearGraffiti() {
  for (const decal of sprayDecals) {
    decal.dispose();
  }

  sprayDecals.length = 0;
  hasShownDecalWarning = false;
}
```

## Do not break cached materials

When clearing graffiti:

- dispose decals
- do not dispose cached spray materials/textures unless there is a specific cleanup function for full app disposal
- cached materials should remain available for future spray painting

## Visual behavior

Paint should feel persistent:

- old strokes stay visible
- new strokes accumulate
- strokes can overlap
- clearing is manual

## If performance becomes a problem

Do not solve performance by deleting old paint automatically.

Instead, keep these optimizations:

- cached materials/textures
- reasonable spray density
- capped interpolation steps
- no console spam
- low render resolution / hardware scaling if already implemented
- lower default spray density if necessary

If needed, reduce new decal creation rate slightly, but do not erase old paint behind the user’s back.

## Final verification

Run the app and verify:

1. Spray Mode works.
2. Paint appears on the bust.
3. Continue painting for a while.
4. Older paint remains visible.
5. New paint accumulates.
6. No paint disappears automatically.
7. `Limpiar pintura` removes all paint.
8. After clearing, painting works again.
9. Camera/cursor interaction still returns when Spray Mode is off.
10. App remains stable.
11. No console errors.

## Expected result

The graffiti should now behave like persistent paint:

- it stays on the 3D bust
- it accumulates over time
- it only disappears when the user clicks `Limpiar pintura`
