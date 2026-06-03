import * as BABYLON from '@babylonjs/core';

/**
 * Lipsync system for Artigas Canta.
 *
 * Priority:
 *  1. Morph targets (mouthOpen, jawOpen, viseme_*)
 *  2. Mouth/jaw mesh (mouth, jaw, boca, mandibula, lips, labio)
 *  3. Procedural mouth (dark oval disc fallback)
 *
 * Future phoneme/viseme JSON support via loadVisemeData() / getVisemeFrame().
 */

// --- Tunable constants ---
const PROCEDURAL_MOUTH_CONFIG = {
  offset: { x: 0, y: 0.15, z: -0.42 },
  baseScale: { x: 0.24, y: 0.025, z: 1 },
  openScaleMultiplier: 5.5,
  forwardOffset: 0.025,
};

const DEBUG_MOUTH = false;

const MOUTH_OPEN_MAX = 0.8;
const AMPLITUDE_THRESHOLD = 0.015;
const IDLE_MOUTH = 0.005;
const SMOOTHING = 0.18;
const AMP_EXAGGERATION = 2.8;

let frameCount = 0;

/**
 * Create the lipsync system.
 *
 * @param {BABYLON.Scene} scene
 * @param {object} bustInfo - returned from loadBust()
 * @param {object} audioManager - returned from createAudioManager()
 */
export function createLipsyncSystem(scene, bustInfo, audioManager) {
  const {
    allMeshes,
    headMesh,
    mouthMesh,
    hasMorphTargets,
    morphTargetNames,
    rootMesh,
    isPlaceholder,
    mouthPosition,
  } = bustInfo;

  let currentMouthOpen = 0;
  let currentJawOpen = 0;
  let enabled = true;
  let visemeData = null;
  let proceduralMouth = null;
  let strategy = 'none';
  let debugMarker = null;

  // Determine best strategy
  if (hasMorphTargets && morphTargetNames.length > 0) {
    strategy = 'morph';
    console.log('[Lipsync] Strategy: morph targets');
    console.log('[Lipsync]   Available morph targets:', morphTargetNames.join(', '));
  } else if (mouthMesh) {
    strategy = 'mesh';
    console.log(`[Lipsync] Strategy: mouth/jaw mesh ("${mouthMesh.name}")`);
  } else {
    strategy = 'procedural';
    console.log('[Lipsync] Strategy: procedural mouth fallback');
    const mpos = mouthPosition || PROCEDURAL_MOUTH_CONFIG.offset;
    proceduralMouth = createProceduralMouth(scene, rootMesh, mpos);
    if (proceduralMouth) {
      console.log(`[Lipsync]   Mouth placed at (${mpos.x.toFixed(2)}, ${mpos.y.toFixed(2)}, ${mpos.z.toFixed(2)})`);
    }
  }

  // --- Morph target helpers ---
  const morphTargetMap = buildMorphTargetMap();

  function buildMorphTargetMap() {
    const map = {};
    if (!hasMorphTargets) return map;

    const want = ['mouthOpen', 'jawOpen', 'MouthOpen', 'viseme_A', 'viseme_O', 'viseme_M', 'viseme_aa', 'open'];

    for (const mesh of allMeshes) {
      const mgr = mesh.morphTargetManager;
      if (!mgr || mgr.numTargets === 0) continue;

      for (let i = 0; i < mgr.numTargets; i++) {
        const t = mgr.getTarget(i);
        if (!t) continue;
        const name = t.name || '';
        const lower = name.toLowerCase();
        if (want.includes(lower) && !map[name]) {
          map[name] = { mesh, target: t, index: i };
        }
      }
    }
    return map;
  }

  // --- Procedural mouth creation ---
  function createProceduralMouth(scene, parent, pos) {
    const cfg = PROCEDURAL_MOUTH_CONFIG;

    // Dark mouth material
    const mouthMat = new BABYLON.StandardMaterial('procMouthMat', scene);
    if (DEBUG_MOUTH) {
      // Debug mode: more visible
      mouthMat.diffuseColor = new BABYLON.Color3(0.15, 0.02, 0.02);
      mouthMat.emissiveColor = new BABYLON.Color3(0.08, 0.0, 0.0);
    } else {
      mouthMat.diffuseColor = new BABYLON.Color3(0.04, 0.0, 0.0);
      mouthMat.emissiveColor = new BABYLON.Color3(0.02, 0.0, 0.0);
    }
    mouthMat.specularColor = new BABYLON.Color3(0, 0, 0);
    mouthMat.backFaceCulling = false;
    mouthMat.alpha = 0.95;

    // Create a disc for the mouth
    const mouth = BABYLON.MeshBuilder.CreateDisc(
      'proceduralMouth',
      { radius: 0.08, tessellation: 20, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
      scene
    );

    // Position slightly in front of the face
    mouth.position = new BABYLON.Vector3(
      pos.x,
      pos.y,
      pos.z - cfg.forwardOffset
    );

    // Initial scale — oval shape
    mouth.scaling = new BABYLON.Vector3(
      cfg.baseScale.x / 0.08,
      cfg.baseScale.y / 0.08,
      1
    );

    mouth.material = mouthMat;

    // Parent to the bust root so it moves with the model
    mouth.parent = parent;

    // Store base scale for animation
    mouth.metadata = {
      baseScaleX: cfg.baseScale.x,
      baseScaleY: cfg.baseScale.y,
    };

    // Debug: tiny red sphere at mouth position
    if (DEBUG_MOUTH) {
      debugMarker = BABYLON.MeshBuilder.CreateSphere(
        'mouthDebugMarker',
        { diameter: 0.03 },
        scene
      );
      debugMarker.position = mouth.position.clone();
      debugMarker.parent = parent;
      const markerMat = new BABYLON.StandardMaterial('mouthMarkerMat', scene);
      markerMat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2);
      markerMat.emissiveColor = new BABYLON.Color3(0.6, 0, 0);
      debugMarker.material = markerMat;
    }

    return mouth;
  }

  // --- Update function (called each frame) ---
  function update(deltaTime) {
    frameCount++;
    if (!enabled) return;

    const amplitude = audioManager.getAmplitude();
    const isPlaying = audioManager.getPlaying();

    let targetOpen;
    if (!isPlaying) {
      targetOpen = 0;
    } else if (amplitude < AMPLITUDE_THRESHOLD) {
      targetOpen = IDLE_MOUTH;
    } else {
      targetOpen = Math.min(amplitude * AMP_EXAGGERATION, MOUTH_OPEN_MAX);
    }

    // Smooth interpolation
    currentMouthOpen += (targetOpen - currentMouthOpen) * SMOOTHING;
    currentJawOpen += (targetOpen - currentJawOpen) * SMOOTHING * 0.7;

    // Debug: log amplitude every 60 frames (~1 second)
    if (DEBUG_MOUTH && frameCount % 60 === 0 && isPlaying) {
      console.log(`[Lipsync] frame=${frameCount} amp=${amplitude.toFixed(3)} targetOpen=${targetOpen.toFixed(3)} mouthOpen=${currentMouthOpen.toFixed(3)}`);
    }

    // Apply via chosen strategy
    switch (strategy) {
      case 'morph':
        applyMorphTargets();
        break;
      case 'mesh':
        applyMeshAnimation();
        break;
      case 'procedural':
        applyProceduralAnimation();
        break;
    }
  }

  function applyMorphTargets() {
    if (morphTargetMap.mouthOpen) {
      morphTargetMap.mouthOpen.target.influence = currentMouthOpen;
    } else if (morphTargetMap.MouthOpen) {
      morphTargetMap.MouthOpen.target.influence = currentMouthOpen;
    }

    if (morphTargetMap.jawOpen) {
      morphTargetMap.jawOpen.target.influence = currentJawOpen;
    }

    if (morphTargetMap.viseme_A) {
      morphTargetMap.viseme_A.target.influence = currentMouthOpen * 0.8;
    }

    if (morphTargetMap.viseme_O) {
      morphTargetMap.viseme_O.target.influence = Math.max(0, 1 - currentMouthOpen) * 0.5;
    }
    if (morphTargetMap.viseme_M) {
      morphTargetMap.viseme_M.target.influence = Math.max(0, 1 - currentMouthOpen) * 0.6;
    }
  }

  function applyMeshAnimation() {
    if (!mouthMesh) return;
    const openScale = 1 + currentMouthOpen * 0.5;
    mouthMesh.scaling.y = openScale;
    mouthMesh.scaling.x = 1 + currentMouthOpen * 0.1;
  }

  function applyProceduralAnimation() {
    if (!proceduralMouth) return;
    const base = proceduralMouth.metadata;
    if (!base) return;

    const cfg = PROCEDURAL_MOUTH_CONFIG;

    // Open mouth: increase vertical scale dramatically
    const openY = (base.baseScaleY / 0.08) * (1 + currentMouthOpen * cfg.openScaleMultiplier);
    proceduralMouth.scaling.y = openY;

    // Slight width increase when open
    proceduralMouth.scaling.x = (base.baseScaleX / 0.08) * (1 + currentMouthOpen * 0.6);
  }

  // --- Public API ---
  function setEnabled(val) {
    enabled = val;
    if (!val) {
      currentMouthOpen = 0;
      currentJawOpen = 0;
      if (strategy === 'morph') {
        applyMorphTargets();
      } else if (strategy === 'procedural' && proceduralMouth) {
        const base = proceduralMouth.metadata;
        if (base) {
          proceduralMouth.scaling.y = base.baseScaleY / 0.08;
          proceduralMouth.scaling.x = base.baseScaleX / 0.08;
        }
      }
    }
  }

  function loadVisemeData(data) {
    visemeData = data;
    console.log('[Lipsync] Viseme data loaded:', data.length, 'frames');
  }

  function getVisemeFrame(time) {
    if (!visemeData) return null;
    let frame = null;
    for (let i = 0; i < visemeData.length; i++) {
      if (visemeData[i].time <= time) {
        frame = visemeData[i];
      } else {
        break;
      }
    }
    return frame;
  }

  function dispose() {
    if (proceduralMouth) {
      proceduralMouth.dispose();
      proceduralMouth = null;
    }
    if (debugMarker) {
      debugMarker.dispose();
      debugMarker = null;
    }
  }

  console.log(`[Lipsync] System initialized. Strategy: ${strategy}`);

  return {
    update,
    setEnabled,
    loadVisemeData,
    getVisemeFrame,
    dispose,
    getStrategy: () => strategy,
  };
}
