import * as BABYLON from '@babylonjs/core';

/**
 * Spray paint graffiti system for Artigas Canta.
 *
 * Uses Babylon.js raycasting + MeshBuilder.CreateDecal so paint is created on
 * the picked 3D bust mesh, not on a screen overlay.
 */

const MAX_DECALS = 2000;
const DELETE_OLD_DECALS_AUTOMATICALLY = false;
const DECAL_WARNING_THRESHOLD = 1500;
const MIN_SPRAY_INTERVAL_MS = 18;
const DECAL_SURFACE_OFFSET = 0;
const SPRAY_SPACING_RATIO = 0.5;
const MIN_SPRAY_DISTANCE_RATIO = 0.3;
const MAX_INTERPOLATED_DECALS = 5;

const DEBUG_GRAFFITI = false;

const COLORS = [
  { name: 'Negro',    hex: '#111111' },
  { name: 'Rojo',     hex: '#d71920' },
  { name: 'Blanco',   hex: '#f5f5f5' },
  { name: 'Celeste',  hex: '#5bc0eb' },
  { name: 'Amarillo', hex: '#ffd23f' },
];

const textureCache = new Map();
const materialCache = new Map();

function createSprayTexture(scene, hexColor) {
  const key = `${scene.uid || 'scene'}_${hexColor}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 4;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.28, `rgba(${r},${g},${b},0.95)`);
  grad.addColorStop(0.56, `rgba(${r},${g},${b},0.42)`);
  grad.addColorStop(0.82, `rgba(${r},${g},${b},0.12)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 70; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = maxRadius * Math.sqrt(Math.random());
    const dotSize = 0.8 + Math.random() * 3.2;
    const alpha = (0.1 + Math.random() * 0.45) * (1 - dist / maxRadius);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, dotSize, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();
  }

  const tex = new BABYLON.DynamicTexture(`spray_${hexColor}`, canvas, scene, false);
  tex.hasAlpha = true;
  tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  tex.update(false);

  textureCache.set(key, tex);
  return tex;
}

function getDebugMaterial(scene) {
  const key = `${scene.uid || 'scene'}_debug_red`;
  if (materialCache.has(key)) return materialCache.get(key);

  const mat = new BABYLON.StandardMaterial('debugSprayRed', scene);
  mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
  mat.emissiveColor = new BABYLON.Color3(0.75, 0, 0);
  mat.specularColor = new BABYLON.Color3(0, 0, 0);
  mat.alpha = 1;
  mat.backFaceCulling = false;
  mat.zOffset = -2;
  mat.zOffsetUnits = -2;
  materialCache.set(key, mat);
  return mat;
}

function getSprayMaterial(scene, hexColor, opacity) {
  const alpha = Number(opacity.toFixed(2));
  const key = `${scene.uid || 'scene'}_${hexColor}_${alpha}`;
  if (materialCache.has(key)) return materialCache.get(key);

  const mat = new BABYLON.StandardMaterial(`sprayMat_${hexColor}`, scene);
  mat.diffuseTexture = createSprayTexture(scene, hexColor);
  mat.diffuseTexture.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  mat.emissiveColor = BABYLON.Color3.FromHexString(hexColor).scale(0.45);
  mat.specularColor = new BABYLON.Color3(0, 0, 0);
  mat.alpha = opacity;
  mat.backFaceCulling = false;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  mat.zOffset = -2;
  mat.zOffsetUnits = -2;
  materialCache.set(key, mat);
  return mat;
}

function nudgeDecalOut(decal, amount) {
  const positions = decal.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const normals = decal.getVerticesData(BABYLON.VertexBuffer.NormalKind);
  if (!positions || !normals) return;

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += normals[i] * amount;
    positions[i + 1] += normals[i + 1] * amount;
    positions[i + 2] += normals[i + 2] * amount;
  }

  decal.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
  decal.refreshBoundingInfo(true, true);
}

/**
 * @param {BABYLON.Scene} scene
 * @param {BABYLON.Camera} camera
 * @param {HTMLCanvasElement} canvas
 * @param {BABYLON.AbstractMesh[]} paintableMeshes
 * @param {object} bustInfo
 * @param {function} onSprayModeChange callback(enabled) to freeze/unfreeze other systems
 */
export function createGraffitiSystem(scene, camera, canvas, paintableMeshes, bustInfo, onSprayModeChange) {
  let sprayMode = false;
  let isPainting = false;
  let currentColorHex = COLORS[0].hex;
  let currentSize = 0.06;
  let currentOpacity = 0.85;
  let lastSprayTime = 0;
  let lastPaintHit = null;
  let cameraDetached = false;
  let activePointerId = null;
  let spraySessionStartedAt = 0;
  let spraySessionCreated = 0;
  let hasShownDecalWarning = false;
  let onLocalSprayDecal = null;
  const sprayDecals = [];
  let paintableSet = new Set(paintableMeshes);

  for (const mesh of paintableMeshes) {
    mesh.isPickable = true;
  }

  console.log('[Graffiti] System initialized');
  console.log('[Graffiti] Paintable meshes:', paintableMeshes.map(m => `${m.name} (${m.getTotalVertices?.() || 0} vertices)`));

  function isPaintable(mesh) {
    if (!mesh) return false;
    if (paintableSet.has(mesh)) return true;
    let parent = mesh.parent;
    while (parent) {
      if (paintableSet.has(parent)) return true;
      parent = parent.parent;
    }
    return false;
  }

  function hasPaintableGeometry(mesh) {
    return !!(
      mesh &&
      mesh.isVisible &&
      mesh.isPickable !== false &&
      typeof mesh.getTotalVertices === 'function' &&
      mesh.getTotalVertices() > 0
    );
  }

  function getPointerPosition(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  function pickPaintableAt(x, y) {
    return scene.pick(x, y, mesh => isPaintable(mesh));
  }

  function pickAnyVisibleMeshAt(x, y) {
    return scene.pick(x, y, mesh => hasPaintableGeometry(mesh) && !String(mesh.name || '').toLowerCase().includes('decal'));
  }

  function getPickNormal(pick) {
    let normal = null;
    try {
      normal = pick.getNormal?.(true, true) || pick.getNormal?.(true) || null;
    } catch (err) {
      if (DEBUG_GRAFFITI) console.warn('[Graffiti] pick.getNormal failed:', err.message || err);
    }

    if (normal && normal.lengthSquared() > 0.000001) {
      return normal.normalize();
    }

    if (pick?.pickedPoint && camera.globalPosition) {
      return camera.globalPosition.subtract(pick.pickedPoint).normalize();
    }

    return BABYLON.Vector3.Up();
  }

  function disposeDecal(decal) {
    decal?.dispose();
  }

  function vectorToPayload(vector) {
    return {
      x: Number(vector.x.toFixed(5)),
      y: Number(vector.y.toFixed(5)),
      z: Number(vector.z.toFixed(5)),
    };
  }

  function findRemoteMesh(meshName) {
    if (meshName) {
      const exact = paintableMeshes.find(mesh => mesh.name === meshName);
      if (exact) return exact;
    }

    let largest = null;
    let largestVertexCount = 0;
    for (const mesh of paintableMeshes) {
      const vertexCount = mesh.getTotalVertices?.() || 0;
      if (vertexCount > largestVertexCount) {
        largest = mesh;
        largestVertexCount = vertexCount;
      }
    }
    return largest;
  }

  function placeDecal(hit, options = {}) {
    if (!hit?.hit || !hit.pickedMesh || !hit.pickedPoint) return false;

    const pickedMesh = hit.pickedMesh;
    const normal = options.normal || hit.normal || getPickNormal(hit);
    const size = options.size || currentSize * (1.15 + Math.random() * 0.45);
    const angle = options.angle ?? Math.random() * Math.PI * 2;
    const color = options.color || currentColorHex;
    const opacity = options.opacity ?? currentOpacity;
    const decalMaterial = options.debug
      ? getDebugMaterial(scene)
      : getSprayMaterial(scene, color, opacity);

    try {
      const decal = BABYLON.MeshBuilder.CreateDecal('sprayDecal', pickedMesh, {
        position: hit.pickedPoint,
        normal,
        size: new BABYLON.Vector3(size, size, size),
        angle,
        cullBackFaces: true,
        localMode: true,
      });

      if (!decal.getTotalVertices || decal.getTotalVertices() === 0) {
        decal.dispose();
        if (DEBUG_GRAFFITI) {
          console.warn('[Graffiti] Decal had no vertices; skipped.', {
            pickedMesh: pickedMesh.name,
            point: hit.pickedPoint.toString?.(),
            normal: normal.toString?.(),
          });
        }
        return false;
      }

      if (DECAL_SURFACE_OFFSET > 0) {
        nudgeDecalOut(decal, DECAL_SURFACE_OFFSET);
      }
      decal.material = decalMaterial;
      decal.isPickable = false;
      decal.alwaysSelectAsActiveMesh = true;
      sprayDecals.push(decal);
      spraySessionCreated++;

      if (sprayDecals.length > DECAL_WARNING_THRESHOLD && !hasShownDecalWarning) {
        console.warn('[Graffiti] Muchos trazos de pintura pueden bajar el rendimiento. Usa "Limpiar" para resetear.');
        hasShownDecalWarning = true;
      }

      if (DELETE_OLD_DECALS_AUTOMATICALLY) {
        while (sprayDecals.length > MAX_DECALS) {
          disposeDecal(sprayDecals.shift());
        }
      }

      if (DEBUG_GRAFFITI || options.debug) {
        console.log('[Graffiti] Decal created', {
          pickedMesh: pickedMesh.name,
          decals: sprayDecals.length,
          point: hit.pickedPoint.toString?.(),
          normal: normal.toString?.(),
          size,
        });
      }

      if (!options.remote && !options.debug && onLocalSprayDecal) {
        onLocalSprayDecal({
          meshName: pickedMesh.name || '',
          point: vectorToPayload(hit.pickedPoint),
          normal: vectorToPayload(normal),
          color,
          size: Number(size.toFixed(5)),
          angle: Number(angle.toFixed(5)),
          timestamp: Date.now(),
        });
      }

      return true;
    } catch (err) {
      console.error('[Graffiti] Decal creation failed:', err.message || err, {
        pickedMesh: pickedMesh.name,
        point: hit.pickedPoint.toString?.(),
        normal: normal.toString?.(),
      });
      return false;
    }
  }

  function makePaintHit(pick) {
    if (!pick?.hit || !pick.pickedMesh || !pick.pickedPoint) return null;
    return {
      hit: true,
      pickedMesh: pick.pickedMesh,
      pickedPoint: pick.pickedPoint.clone(),
      normal: getPickNormal(pick).clone(),
      time: performance.now(),
    };
  }

  function placeStrokeBetween(previousHit, currentHit) {
    if (!previousHit || previousHit.pickedMesh !== currentHit.pickedMesh) {
      return placeDecal(currentHit);
    }

    const distance = BABYLON.Vector3.Distance(previousHit.pickedPoint, currentHit.pickedPoint);
    const minDistance = Math.max(currentSize * MIN_SPRAY_DISTANCE_RATIO, 0.01);
    if (distance < minDistance) return false;

    const spacing = Math.max(currentSize * SPRAY_SPACING_RATIO, minDistance);
    const steps = Math.min(MAX_INTERPOLATED_DECALS, Math.max(1, Math.ceil(distance / spacing)));
    let createdAny = false;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const point = BABYLON.Vector3.Lerp(previousHit.pickedPoint, currentHit.pickedPoint, t);
      const normal = BABYLON.Vector3.Lerp(previousHit.normal, currentHit.normal, t);

      if (normal.lengthSquared() < 0.000001) {
        normal.copyFrom(currentHit.normal);
      } else {
        normal.normalize();
      }

      const created = placeDecal({
        hit: true,
        pickedMesh: currentHit.pickedMesh,
        pickedPoint: point,
        normal,
      }, { normal });

      createdAny = createdAny || created;
    }

    return createdAny;
  }

  function sprayAtEvent(evt) {
    const pointer = getPointerPosition(evt);
    const pick = pickPaintableAt(pointer.x, pointer.y);

    if (!pick?.hit || !pick.pickedPoint) {
      lastPaintHit = null;
      return false;
    }

    const currentHit = makePaintHit(pick);
    if (!currentHit) return false;

    const created = lastPaintHit
      ? placeStrokeBetween(lastPaintHit, currentHit)
      : placeDecal(currentHit);
    if (created) {
      lastPaintHit = currentHit;
    }
    return created;
  }

  function detachCameraControls() {
    if (cameraDetached) return;
    camera.detachControl(canvas);
    cameraDetached = true;
  }

  function attachCameraControls() {
    if (!cameraDetached) return;
    camera.attachControl(canvas, true);
    cameraDetached = false;
  }

  function stopPainting(evt) {
    isPainting = false;
    lastPaintHit = null;
    if (
      activePointerId !== null &&
      (!evt || evt.pointerId === activePointerId) &&
      canvas.hasPointerCapture?.(activePointerId)
    ) {
      canvas.releasePointerCapture(activePointerId);
    }
    activePointerId = null;
  }

  function onPointerDown(evt) {
    if (!sprayMode) return;

    evt.preventDefault();
    const pointer = getPointerPosition(evt);
    const pick = pickPaintableAt(pointer.x, pointer.y);

    if (DEBUG_GRAFFITI) {
      console.log('[Graffiti] Spray pointerdown', {
        x: Math.round(pointer.x),
        y: Math.round(pointer.y),
        hit: !!pick?.hit,
        pickedMesh: pick?.pickedMesh?.name,
        pickedPoint: pick?.pickedPoint?.toString?.(),
      });
    }

    if (!pick?.hit) {
      if (DEBUG_GRAFFITI) {
        const broadPick = pickAnyVisibleMeshAt(pointer.x, pointer.y);
        console.warn('[Graffiti] No paintable hit under pointer.', {
          broadHit: !!broadPick?.hit,
          broadMesh: broadPick?.pickedMesh?.name,
          paintableCount: paintableMeshes.length,
        });
      }
      return;
    }

    isPainting = true;
    activePointerId = evt.pointerId;
    lastSprayTime = 0;
    lastPaintHit = null;
    canvas.setPointerCapture?.(evt.pointerId);
    lastPaintHit = makePaintHit(pick);
    if (lastPaintHit) {
      placeDecal(lastPaintHit);
    }
  }

  function onPointerMove(evt) {
    if (!sprayMode || !isPainting) return;
    evt.preventDefault();

    const now = performance.now();
    if (now - lastSprayTime < MIN_SPRAY_INTERVAL_MS) return;

    lastSprayTime = now;
    sprayAtEvent(evt);
  }

  function onPointerUp(evt) {
    stopPainting(evt);
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  function setSprayMode(enabled) {
    if (sprayMode === enabled) return;

    sprayMode = enabled;
    stopPainting();

    if (enabled) {
      spraySessionStartedAt = performance.now();
      spraySessionCreated = 0;
      detachCameraControls();
    } else {
      attachCameraControls();
      if (spraySessionStartedAt > 0) {
        const elapsedSeconds = Math.max((performance.now() - spraySessionStartedAt) / 1000, 0.001);
        console.log('[Graffiti] Spray summary:', {
          decalsCreated: spraySessionCreated,
          activeDecals: sprayDecals.length,
          maxDecals: MAX_DECALS,
          decalsPerSecond: Number((spraySessionCreated / elapsedSeconds).toFixed(1)),
          intervalMs: MIN_SPRAY_INTERVAL_MS,
          maxInterpolationSteps: MAX_INTERPOLATED_DECALS,
        });
      }
      spraySessionStartedAt = 0;
    }

    onSprayModeChange?.(enabled);
    console.log('[Graffiti] Spray mode:', enabled ? 'ON' : 'OFF');
  }

  function setColor(index) {
    if (index >= 0 && index < COLORS.length) {
      currentColorHex = COLORS[index].hex;
    }
  }

  function setSize(size) {
    currentSize = Math.max(0.03, Math.min(0.35, size));
  }

  function setOpacity(opacity) {
    currentOpacity = Math.max(0.2, Math.min(1, opacity));
  }

  function clearAll() {
    for (const decal of sprayDecals) {
      disposeDecal(decal);
    }
    sprayDecals.length = 0;
    hasShownDecalWarning = false;
    console.log('[Graffiti] Cleared all decals');
  }

  function setPaintableMeshes(nextPaintableMeshes) {
    stopPainting();
    paintableMeshes = nextPaintableMeshes || [];
    paintableSet = new Set(paintableMeshes);
    for (const mesh of paintableMeshes) {
      mesh.isPickable = true;
    }
    console.log('[Graffiti] Paintable meshes updated:', paintableMeshes.map(m => m.name));
  }

  function setLocalSprayHandler(handler) {
    onLocalSprayDecal = typeof handler === 'function' ? handler : null;
  }

  function applyRemoteSprayDecal(payload) {
    if (!payload?.point || !payload?.normal) return false;
    const mesh = findRemoteMesh(payload.meshName);
    if (!mesh) return false;

    const point = new BABYLON.Vector3(
      Number(payload.point.x),
      Number(payload.point.y),
      Number(payload.point.z)
    );
    const normal = new BABYLON.Vector3(
      Number(payload.normal.x),
      Number(payload.normal.y),
      Number(payload.normal.z)
    );

    if (!Number.isFinite(point.x + point.y + point.z + normal.x + normal.y + normal.z)) {
      return false;
    }
    if (normal.lengthSquared() < 0.000001) {
      return false;
    }
    normal.normalize();

    return placeDecal({
      hit: true,
      pickedMesh: mesh,
      pickedPoint: point,
      normal,
    }, {
      remote: true,
      normal,
      color: typeof payload.color === 'string' ? payload.color : currentColorHex,
      size: Math.max(0.01, Math.min(0.45, Number(payload.size) || currentSize)),
      angle: Number.isFinite(Number(payload.angle)) ? Number(payload.angle) : 0,
    });
  }

  function dispose() {
    clearAll();
    for (const material of materialCache.values()) material.dispose();
    materialCache.clear();
    for (const texture of textureCache.values()) texture.dispose();
    textureCache.clear();
    attachCameraControls();
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
  }

  function debugTestSpray() {
    console.group('[Graffiti] Debug Test Decal');

    if (paintableMeshes.length === 0) {
      console.warn('FAIL: no paintable meshes');
      console.groupEnd();
      return false;
    }

    const x = canvas.clientWidth / 2;
    const y = canvas.clientHeight / 2;
    const pick = pickPaintableAt(x, y);

    if (!pick?.hit) {
      const broadPick = pickAnyVisibleMeshAt(x, y);
      console.warn('FAIL: no pick hit at screen center', {
        x,
        y,
        broadHit: !!broadPick?.hit,
        broadMesh: broadPick?.pickedMesh?.name,
      });
      console.groupEnd();
      return false;
    }

    if (!pick.pickedPoint) {
      console.warn('FAIL: missing picked point', { pickedMesh: pick.pickedMesh?.name });
      console.groupEnd();
      return false;
    }

    const normal = getPickNormal(pick);
    if (!normal) {
      console.warn('FAIL: missing normal', { pickedMesh: pick.pickedMesh?.name });
      console.groupEnd();
      return false;
    }

    console.log('[Graffiti] Pick hit:', true, 'mesh:', pick.pickedMesh?.name);
    console.log('[Graffiti] Picked point:', pick.pickedPoint.toString?.());
    console.log('[Graffiti] Picked normal:', normal.toString?.());

    const created = placeDecal(pick, { debug: true, size: 0.32, angle: 0 });
    console.log(created ? '[Graffiti] Bright red debug decal created' : 'FAIL: decal creation failed');
    console.log('[Graffiti] Total decals:', sprayDecals.length);
    console.groupEnd();
    return created;
  }

  return {
    setSprayMode,
    setColor,
    setSize,
    setOpacity,
    setPaintableMeshes,
    setLocalSprayHandler,
    applyRemoteSprayDecal,
    clearAll,
    dispose,
    debugTestSpray,
    getPaintCount: () => sprayDecals.length,
    getMaxDecals: () => MAX_DECALS,
    getColors: () => COLORS,
  };
}
