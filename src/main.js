/**
 * Artigas Canta — Main entry point (Babylon.js)
 *
 * Wires ArcRotateCamera (orbit/zoom), bust loading, subtle cursor rotation,
 * elastic deformation, graffiti spray paint, audio playback, lipsync, and UI controls.
 */

import * as BABYLON from '@babylonjs/core';
import { createScene } from './scene/createScene.js';
import { loadBust } from './scene/loadBust.js';
import { createCursorRotation } from './scene/interaction.js';
import { createElasticDeform } from './scene/elasticDeform.js';
import { createGraffitiSystem } from './scene/graffiti.js';
import { createAudioManager } from './scene/audio.js';
import { createLipsyncSystem } from './scene/lipsync.js';
import { createCollaborationSystem } from './network/collaboration.js';
import { createControls } from './ui/controls.js';
import './styles.css';

/**
 * Resolve a public/ asset path for the configured Vite base URL.
 * Works both locally and when deployed under a subdirectory like /PatriaPaint/.
 */
function publicAsset(path) {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${cleanPath}`;
}

const CHARACTER_MANIFEST_PATH = publicAsset('/models/characters/manifest.json');
const AUDIO_MANIFEST_PATH = publicAsset('/audio/manifest.json');
const ENABLE_LIPSYNC = false;
const FALLBACK_CHARACTERS = [
  { id: 'artigas-low', name: 'Artigas Low', file: publicAsset('/models/characters/artigas-low.glb') },
];
const FALLBACK_TRACKS = [
  { id: 'marcha-mi-bandera', name: 'Marcha Mi Bandera', file: publicAsset('/audio/marcha-mi-bandera.mp3') },
];

/**
 * Filter meshes to only include paintable model surfaces.
 * Excludes mouth, debug markers, helpers, and invisible meshes.
 */
function buildPaintableMeshes(allMeshes, rootMesh) {
  console.group('[Artigas] Paintable mesh candidates');
  for (const mesh of allMeshes) {
    console.log({
      name: mesh?.name,
      isVisible: mesh?.isVisible,
      vertices: mesh?.getTotalVertices?.(),
      isPickable: mesh?.isPickable,
    });
  }
  console.groupEnd();

  const paintableMeshes = allMeshes.filter(mesh => {
    if (!mesh || !mesh.isVisible) return false;
    if (typeof mesh.getTotalVertices !== 'function' || mesh.getTotalVertices() <= 0) return false;

    const name = (mesh.name || '').toLowerCase();
    if (name.includes('mouth') || name.includes('boca')) return false;
    if (name.includes('helper') || name.includes('debug')) return false;
    if (name.includes('marker')) return false;
    if (name.includes('particle')) return false;
    if (name.includes('decal')) return false;
    if (name === 'diagnostic') return false;
    if (name === 'proceduralmouth') return false;
    if (name === 'mouthdebugmarker') return false;
    if (name === 'graffitimark') return false;
    if (name === 'spraydecal') return false;

    return true;
  });

  if (paintableMeshes.length === 0) {
    console.warn('[Artigas] No paintable meshes passed the strict filter; broadening to visible vertex meshes.');
    const fallbackMeshes = allMeshes.filter(mesh =>
      mesh &&
      mesh.isVisible &&
      typeof mesh.getTotalVertices === 'function' &&
      mesh.getTotalVertices() > 0
    );
    for (const mesh of fallbackMeshes) {
      mesh.isPickable = true;
    }
    return fallbackMeshes;
  }

  for (const mesh of paintableMeshes) {
    mesh.isPickable = true;
  }

  return paintableMeshes;
}

function getMeshVertices(mesh) {
  if (!mesh || typeof mesh.getTotalVertices !== 'function') return 0;
  return mesh.getTotalVertices() || 0;
}

function getTotalVertices(meshes) {
  return meshes.reduce((total, mesh) => total + getMeshVertices(mesh), 0);
}

function getMaterialTextures(material) {
  if (!material || typeof material.getActiveTextures !== 'function') return [];
  try {
    return material.getActiveTextures() || [];
  } catch (err) {
    return [];
  }
}

function getUniqueModelMaterials(meshes) {
  return new Set(meshes.map(mesh => mesh?.material).filter(Boolean));
}

function getUniqueModelTextures(meshes) {
  const textures = new Set();
  for (const material of getUniqueModelMaterials(meshes)) {
    for (const texture of getMaterialTextures(material)) {
      if (texture) textures.add(texture);
    }
  }
  return textures;
}

function hasShadows(scene) {
  return scene.lights.some(light => Boolean(light.getShadowGenerator?.()));
}

function hasPostProcessing(scene, camera) {
  const scenePostProcesses = scene.postProcesses?.length || 0;
  const cameraPostProcesses = camera?._postProcesses?.filter(Boolean).length || 0;
  const effectLayers = scene.effectLayers?.length || 0;
  return scenePostProcesses > 0 || cameraPostProcesses > 0 || effectLayers > 0;
}

function logPerformanceSummaries({ engine, scene, camera, canvas, bustInfo, paintableMeshes }) {
  const modelMeshes = bustInfo?.allMeshes || [];
  const totalVertices = getTotalVertices(scene.meshes);
  const modelVertices = getTotalVertices(modelMeshes);
  const modelMaterials = getUniqueModelMaterials(modelMeshes);
  const modelTextures = getUniqueModelTextures(modelMeshes);

  console.group('Scene Performance Summary');
  console.log('Meshes:', scene.meshes.length);
  console.log('Materials:', scene.materials.length);
  console.log('Textures:', scene.textures.length);
  console.log('Total vertices:', totalVertices);
  console.log('Device pixel ratio:', window.devicePixelRatio);
  console.log('Render size:', engine.getRenderWidth(), engine.getRenderHeight());
  console.log('Canvas client size:', canvas.clientWidth, canvas.clientHeight);
  console.log('Hardware scaling level:', engine.getHardwareScalingLevel?.());
  console.log('Shadows enabled:', hasShadows(scene));
  console.log('Postprocessing enabled:', hasPostProcessing(scene, camera));
  console.groupEnd();

  console.group('GLB Model Summary');
  console.log('Model meshes:', modelMeshes.length);
  console.log('Model vertices:', modelVertices);
  console.log('Model materials:', modelMaterials.size);
  console.log('Model textures:', modelTextures.size);
  console.log('Paintable meshes:', paintableMeshes?.map(m => m.name));
  console.groupEnd();
}

function createPerformanceOverlay({ engine, scene, camera, canvas, graffiti, bustInfo }) {
  const el = document.createElement('div');
  el.id = 'performance-overlay';
  el.style.cssText =
    'position:fixed;top:10px;right:10px;color:#b8ffb8;font-size:11px;' +
    'font-family:monospace;z-index:999;background:rgba(0,0,0,0.78);' +
    'padding:8px 10px;border-radius:4px;pointer-events:none;line-height:1.35;' +
    'min-width:190px;white-space:pre;';
  document.body.appendChild(el);

  let modelMeshes = bustInfo?.allMeshes || [];
  let modelVertices = getTotalVertices(modelMeshes);
  let modelMeshCount = modelMeshes.length;
  let lastUpdate = 0;

  function update(force = false) {
    const now = performance.now();
    if (!force && now - lastUpdate < 500) return;
    lastUpdate = now;

    const fps = engine.getFps();
    const totalVertices = getTotalVertices(scene.meshes);
    const decalCount = graffiti.getPaintCount();
    const maxDecals = graffiti.getMaxDecals?.() || '?';

    el.textContent =
      `FPS: ${fps.toFixed(0)}\n` +
      `Meshes: ${scene.meshes.length}\n` +
      `Decals: ${decalCount} / ${maxDecals}\n` +
      `Vertices: ${totalVertices.toLocaleString()}\n` +
      `Materials: ${scene.materials.length}\n` +
      `Textures: ${scene.textures.length}\n` +
      `Scale: ${engine.getHardwareScalingLevel?.() ?? 'n/a'}\n` +
      `DPR: ${window.devicePixelRatio}\n` +
      `Render: ${engine.getRenderWidth()} x ${engine.getRenderHeight()}\n` +
      `Canvas: ${canvas.clientWidth} x ${canvas.clientHeight}\n` +
      `Shadows: ${hasShadows(scene) ? 'on' : 'off'}\n` +
      `PostFX: ${hasPostProcessing(scene, camera) ? 'on' : 'off'}\n` +
      `GLB Meshes: ${modelMeshCount}\n` +
      `GLB Verts: ${modelVertices.toLocaleString()}`;
  }

  update(true);
  return {
    update,
    setBustInfo(nextBustInfo) {
      modelMeshes = nextBustInfo?.allMeshes || [];
      modelVertices = getTotalVertices(modelMeshes);
      modelMeshCount = modelMeshes.length;
      update(true);
    },
  };
}

async function loadCharacterManifest() {
  try {
    const response = await fetch(CHARACTER_MANIFEST_PATH);
    if (!response.ok) {
      throw new Error(`Manifest request failed: ${response.status}`);
    }
    const characters = await response.json();
    if (!Array.isArray(characters) || characters.length === 0) {
      throw new Error('Character manifest is empty');
    }
    const usableCharacters = characters.filter(character => character?.id && character?.name && character?.file);
    return (usableCharacters.length > 0 ? usableCharacters : FALLBACK_CHARACTERS)
      .map(character => ({ ...character, file: publicAsset(character.file) }));
  } catch (err) {
    console.warn('[Artigas] Could not load character manifest; using fallback.', err.message || err);
    return FALLBACK_CHARACTERS;
  }
}

async function loadAudioManifest() {
  try {
    const response = await fetch(AUDIO_MANIFEST_PATH);
    if (!response.ok) {
      throw new Error(`Audio manifest request failed: ${response.status}`);
    }
    const tracks = await response.json();
    if (!Array.isArray(tracks) || tracks.length === 0) {
      throw new Error('Audio manifest is empty');
    }
    const usableTracks = tracks.filter(track => track?.id && track?.name && track?.file);
    return (usableTracks.length > 0 ? usableTracks : FALLBACK_TRACKS)
      .map(track => ({ ...track, file: publicAsset(track.file) }));
  } catch (err) {
    console.warn('[Artigas] Could not load audio manifest; using fallback.', err.message || err);
    return FALLBACK_TRACKS;
  }
}

function disposeCharacterModel(info) {
  if (!info) return;
  const meshes = info.allMeshes || [];
  for (const mesh of meshes) {
    if (!mesh.isDisposed?.()) {
      mesh.dispose(false, true);
    }
  }
  if (info.rootMesh && !info.rootMesh.isDisposed?.()) {
    info.rootMesh.dispose(false, true);
  }
}

function getModelBounds(meshes) {
  let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
  let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
  let found = false;

  for (const mesh of meshes || []) {
    if (!mesh?.getBoundingInfo || mesh.isDisposed?.()) continue;
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    min = BABYLON.Vector3.Minimize(min, bounds.minimumWorld);
    max = BABYLON.Vector3.Maximize(max, bounds.maximumWorld);
    found = true;
  }

  if (!found) return null;

  const center = min.add(max).scale(0.5);
  const size = max.subtract(min);
  return { min, max, center, size };
}

function frameCameraForModel(camera, bustInfo) {
  const bounds = getModelBounds(bustInfo?.allMeshes);
  if (!bounds) {
    camera.setTarget(new BABYLON.Vector3(0, 0.3, 0));
    camera.radius = 4;
    return;
  }

  const height = Math.max(bounds.size.y, 1);
  const maxDim = Math.max(bounds.size.x, bounds.size.y, bounds.size.z, 1);
  const target = bounds.center.clone();
  target.y += height * 0.04;

  camera.setTarget(target);
  camera.radius = Math.max(3.2, Math.min(5.4, maxDim * 1.28));
  camera.lowerRadiusLimit = Math.max(1.8, camera.radius * 0.45);
  camera.upperRadiusLimit = Math.max(8, camera.radius * 2.4);
  camera.minZ = 0.05;
  camera.maxZ = 100;
}

function timestampForFilename() {
  const d = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function downloadDataURL(dataURL, filename) {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function init() {
  // Create Babylon.js engine, ArcRotateCamera scene, lighting
  const { engine, scene, camera, canvas } = createScene();

  // Diagnostic sphere — hidden once bust loads
  const diagMat = new BABYLON.StandardMaterial('diagMat', scene);
  diagMat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2);
  diagMat.emissiveColor = new BABYLON.Color3(0.8, 0, 0);
  const diagSphere = BABYLON.MeshBuilder.CreateSphere('diagnostic', { diameter: 0.3 }, scene);
  diagSphere.position.set(1.5, 0.5, 0);
  diagSphere.material = diagMat;
  console.log('[Artigas] Diagnostic sphere created at', diagSphere.position);

  const characters = await loadCharacterManifest();
  const playlist = await loadAudioManifest();
  let activeCharacter = characters[0];

  // Load bust (GLB or placeholder)
  let bustInfo;
  try {
    bustInfo = await loadBust(scene, activeCharacter.file);
  } catch (err) {
    console.error('[Artigas] Error loading bust:', err);
    throw err;
  }
  let rootMesh = bustInfo.rootMesh;
  frameCameraForModel(camera, bustInfo);

  // Hide diagnostic sphere once the bust is loaded
  diagSphere.setEnabled(false);

  // Build paintable meshes for graffiti
  let paintableMeshes = buildPaintableMeshes(bustInfo.allMeshes, rootMesh);
  console.log(`[Artigas] Paintable meshes: ${paintableMeshes.map(m => m.name).join(', ')}`);
  logPerformanceSummaries({ engine, scene, camera, canvas, bustInfo, paintableMeshes });

  // Cursor-based subtle rotation (uses canvas events, doesn't fight camera)
  const cursorRotation = createCursorRotation(canvas, rootMesh);

  // Elastic face deformation
  const elasticDeform = createElasticDeform(scene, rootMesh);

  // Graffiti spray paint system (handles camera attach/detach internally)
  const graffiti = createGraffitiSystem(scene, camera, canvas, paintableMeshes, bustInfo,
    (sprayOn) => {
      // Freeze cursor-reactive bust movement during spray mode
      cursorRotation.freeze(sprayOn);
      // Disable elastic deform during spray to avoid conflicts
      elasticDeform.setEnabled(!sprayOn);
    }
  );

  // Audio manager (Web Audio API)
  const audioManager = createAudioManager();

  // Lipsync is temporarily disabled. Keep the module available for a future restore.
  let lipsyncSystem = null;
  if (ENABLE_LIPSYNC) {
    lipsyncSystem = createLipsyncSystem(scene, bustInfo, audioManager);
  }

  // UI Controls
  let isSwitchingCharacter = false;
  let controls = null;

  const collaboration = createCollaborationSystem({
    getCurrentStatueId: () => activeCharacter.id,
    onRemoteSprayDecal: (payload) => {
      graffiti.applyRemoteSprayDecal(payload);
    },
    onRemoteClearGraffiti: () => {
      graffiti.clearAll();
    },
    onStateSnapshot: (payload) => {
      for (const decal of payload.decals || []) {
        graffiti.applyRemoteSprayDecal(decal);
      }
    },
    onUserCount: (count) => {
      controls?.setCollaborationState({ userCount: count });
    },
    onStatusChange: (state) => {
      controls?.setCollaborationState({
        enabled: state.enabled,
        status: state.status,
        ...(Number.isFinite(state.userCount) ? { userCount: state.userCount } : {}),
      });
    },
  });

  graffiti.setLocalSprayHandler((payload) => {
    collaboration.sendSprayDecal(payload);
  });

  function clearGraffitiForCurrentStatue() {
    graffiti.clearAll();
    collaboration.sendClearGraffiti(activeCharacter.id);
  }

  async function switchCharacter(characterId) {
    if (isSwitchingCharacter) return false;
    const nextCharacter = characters.find(character => character.id === characterId);
    if (!nextCharacter || nextCharacter.id === activeCharacter.id) return true;

    isSwitchingCharacter = true;
    try {
      collaboration.leaveCurrentStatue();
      graffiti.setSprayMode(false);
      graffiti.clearAll();
      lipsyncSystem?.dispose();

      const previousBustInfo = bustInfo;
      const nextBustInfo = await loadBust(scene, nextCharacter.file);

      disposeCharacterModel(previousBustInfo);

      activeCharacter = nextCharacter;
      bustInfo = nextBustInfo;
      rootMesh = bustInfo.rootMesh;
      paintableMeshes = buildPaintableMeshes(bustInfo.allMeshes, rootMesh);
      console.log(`[Artigas] Paintable meshes: ${paintableMeshes.map(m => m.name).join(', ')}`);
      logPerformanceSummaries({ engine, scene, camera, canvas, bustInfo, paintableMeshes });

      cursorRotation.setTarget(rootMesh);
      elasticDeform.setRootMesh(rootMesh);
      graffiti.setPaintableMeshes(paintableMeshes);
      if (ENABLE_LIPSYNC) {
        lipsyncSystem = createLipsyncSystem(scene, bustInfo, audioManager);
      } else {
        lipsyncSystem = null;
      }
      performanceOverlay.setBustInfo(bustInfo);

      frameCameraForModel(camera, bustInfo);
      collaboration.joinStatue(activeCharacter.id);
      console.log(`[Artigas] Character loaded: ${activeCharacter.name}`);
      return true;
    } catch (err) {
      console.error('[Artigas] Could not switch character:', err);
      if (ENABLE_LIPSYNC) {
        lipsyncSystem = createLipsyncSystem(scene, bustInfo, audioManager);
      }
      return false;
    } finally {
      isSwitchingCharacter = false;
    }
  }

  function captureScreenshot() {
    const filename = `graffiti-estatua-${timestampForFilename()}.png`;
    try {
      BABYLON.Tools.CreateScreenshotUsingRenderTarget(
        engine,
        camera,
        { width: 1920, height: 1080 },
        (data) => downloadDataURL(data, filename)
      );
    } catch (err) {
      console.warn('[Artigas] Render-target screenshot failed; using canvas capture.', err.message || err);
      downloadDataURL(canvas.toDataURL('image/png'), filename);
    }
  }

  controls = createControls(audioManager, () => {
    // Song changed callback
  }, graffiti, {
    characters,
    playlist,
    activeCharacterId: activeCharacter.id,
    onCharacterChange: switchCharacter,
    onClearGraffiti: clearGraffitiForCurrentStatue,
    onCapture: captureScreenshot,
    collaboration: {
      onToggle: (enabled) => {
        collaboration.setEnabled(enabled);
        if (enabled) {
          collaboration.joinStatue(activeCharacter.id);
        }
      },
    },
  });

  const performanceOverlay = createPerformanceOverlay({
    engine, scene, camera, canvas, graffiti, bustInfo,
  });

  // Render loop
  engine.runRenderLoop(() => {
    cursorRotation.update();
    elasticDeform.update();
    if (ENABLE_LIPSYNC) {
      const deltaTime = engine.getDeltaTime() / 1000;
      lipsyncSystem?.update(deltaTime);
    }
    controls.updateUI();
    performanceOverlay.update();

    scene.render();
  });

  console.log('[Artigas] Artigas Canta initialized (Babylon.js).');
  console.log('[Artigas] Camera: ArcRotateCamera — drag to orbit, scroll to zoom');
  console.log('[Artigas] Lipsync enabled:', ENABLE_LIPSYNC);
  console.log(`[Artigas] Playlist: ${playlist.map(track => track.name).join(', ')}`);
  console.log('[Artigas] Drag the face for elastic interaction.');
  console.log('[Artigas] Graffiti: click "Modo spray", pick a color, paint on the bust.');
}

init().catch((err) => {
  console.error('[Artigas] Fatal error:', err);
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;top:20px;left:20px;color:red;font-family:monospace;' +
    'z-index:999;background:rgba(0,0,0,0.8);padding:10px;border-radius:4px;';
  el.textContent = '[Artigas] Error: ' + (err.message || err);
  document.body.appendChild(el);
});
