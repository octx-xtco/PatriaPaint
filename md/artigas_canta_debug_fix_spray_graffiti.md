# Hermes / DeepSeek Prompt — Debug and Fix Spray Paint Graffiti

Debug and fix the spray paint graffiti feature in the existing “Artigas Canta” Babylon.js web app.

The spray painting feature currently exists or was attempted, but it is not working: clicking/dragging on the bust does not create visible paint. Debug and fix the existing implementation instead of assuming it works.

The spray must paint on the actual 3D bust surface, not on a 2D screen overlay.

When Spray Mode is OFF:

- camera orbit / zoom works normally
- cursor-reactive bust movement works normally

When Spray Mode is ON:

- freeze cursor-reactive bust movement
- disable camera orbit / drag / zoom
- keep the bust fixed
- use the cursor only for painting
- clicking or dragging over the bust paints on the 3D model surface
- if the cursor is not over the bust, do not paint
- disabling Spray Mode restores normal camera and cursor interaction

Use Babylon.js raycasting + decals.

Do not use a 2D canvas overlay. Do not use Three.js. Do not use Unity code. Do not rewrite the whole app.

## Debug in this order

1. Confirm the graffiti system initializes after the GLB loads.
2. Confirm `paintableMeshes` contains the actual bust meshes.
3. Log paintable mesh names and vertex counts.
4. Confirm Spray Mode toggle actually enables painting.
5. Confirm pointer events are attached to the Babylon canvas.
6. Confirm `scene.pick(scene.pointerX, scene.pointerY, predicate)` hits the bust.
7. If picking fails, temporarily broaden the predicate to any visible mesh with vertices.
8. On pointerdown, log:
   - pointer position
   - pick hit true/false
   - picked mesh name
   - picked point
   - picked normal
9. If pick succeeds but no paint appears, fix decal creation/material/alpha/z-fighting.
10. First make the debug decal obvious: bright red, large, high opacity.
11. Once visible red decals work, restore selected colors and spray texture.

## Spray Mode behavior

On Spray Mode enabled:

- call `camera.detachControl(canvas)`
- disable cursor-reactive bust movement
- enable spray pointer events
- log paintable mesh count and names

On Spray Mode disabled:

- stop active spraying
- call `camera.attachControl(canvas, true)`
- re-enable cursor-reactive bust movement

## Decal creation

Create decals with Babylon.js `MeshBuilder.CreateDecal`.

Each decal should:

- be placed at the picked point
- align to the picked surface normal
- use bright red debug material first
- be non-pickable
- be stored in a `sprayDecals` array
- be disposable by the clear button

Make sure decal material uses transparency correctly:

```js
material.hasAlpha = true;
material.useAlphaFromDiffuseTexture = true;
decal.isPickable = false;
```

If needed, offset decals very slightly along the surface normal to avoid z-fighting.

## Debug Test Decal button

Add a temporary “Debug Test Decal” button.

It should:

- try to place one large red decal on the visible/front area of the bust
- log exactly why if it cannot:
  - no paintable meshes
  - no pick hit
  - invalid normal
  - decal creation failed

## Continuous spray

Once a single visible debug decal works, restore continuous spray.

Expected behavior:

- `pointerdown` over the bust starts painting
- `pointermove` while pressed continues painting
- `pointerup` / `pointercancel` stops painting
- use a minimum distance or time interval to avoid too many decals
- cap decal count for performance
- dispose oldest decals if the max count is exceeded

## Clear graffiti

The clear button should:

- dispose every decal in `sprayDecals`
- empty the array
- not reload the model

## Final expected result

- Spray Mode ON freezes scene interaction and turns the cursor into a painting tool.
- Clicking/dragging over the bust creates visible paint decals on the 3D surface.
- Spray Mode OFF restores normal 3D interaction.
- Clear graffiti removes all decals.
- No blank screen.
- No broken imports.
- No console errors.
