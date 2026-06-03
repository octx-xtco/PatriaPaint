import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';

const BUST_PATH = `${import.meta.env.BASE_URL}models/characters/artigas-low.glb`;
const NORMALIZE_STATUE_MATERIALS = true;
const BRONZE_TINT = new BABYLON.Color3(0.42, 0.28, 0.16);
const WARM_HIGHLIGHT = new BABYLON.Color3(0.95, 0.78, 0.48);

/**
 * Default mouth position constants — tuned for this model's bounding box.
 * Adjust these after inspecting the actual model.
 */
export const MOUTH_POS = { x: 0, y: 0.18, z: -0.55 };
export const MOUTH_SCALE = { x: 0.22, y: 0.035, z: 1 };

/**
 * Loads the GLB bust with detailed inspection logging.
 * On success: inspects meshes, morph targets, and mouth/jaw meshes.
 * On failure: creates a procedural placeholder bust.
 * 
 * Returns: { rootMesh, allMeshes, headMesh, hasMorphTargets, morphTargetNames,
 *            mouthMesh, isPlaceholder, mouthPosition }
 */
export async function loadBust(scene, modelPath = BUST_PATH) {
  // Try loading the GLB
  try {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      '',
      modelPath,
      undefined,
      scene,
      undefined,
      '.glb'
    );

    const rootMeshes = result.meshes;
    if (!rootMeshes || rootMeshes.length === 0) {
      throw new Error('No meshes loaded from GLB');
    }

    // Collect all meshes and inspect
    const info = inspectGLB(rootMeshes);
    info.isPlaceholder = false;

    // Log inspection results
    console.group('[Artigas] GLB Inspection');
    if (info.allMeshes) {
      for (const m of info.allMeshes) {
        console.log(`Mesh: "${m.name}" | vertices: ${getVertexCount(m)} | morphs: ${info.morphTargetNames.length > 0 ? info.morphTargetNames.join(', ') : 'none'}`);
      }
    }
    console.log(`Has morph targets: ${info.hasMorphTargets}`);
    console.log(`Morph target names: ${info.morphTargetNames.join(', ') || 'none'}`);
    console.log(`Has mouth/jaw mesh: ${info.mouthMesh ? info.mouthMesh.name : 'no'}`);
    console.log(`Head mesh: ${info.headMesh ? info.headMesh.name : 'unknown'}`);
    console.log(`Meshes loaded: ${rootMeshes.length}`);
    console.groupEnd();

    // Center and scale the model — use allMeshes for reliable bounding box
    centerAndScale(info.rootMesh || rootMeshes[0], info.allMeshes);

    // Normalize model materials without touching graffiti/decal materials.
    if (NORMALIZE_STATUE_MATERIALS) {
      applyStatueMaterialNormalization(info.allMeshes);
    }

    // Detect mouth position from geometry
    let mouthPos = MOUTH_POS;
    if (info.headMesh) {
      try {
        mouthPos = detectMouthPosition(info.headMesh);
      } catch (e) {
        console.warn('[Artigas] Mouth detection failed:', e.message);
      }
    }
    info.mouthPosition = mouthPos;
    console.log(`[Artigas] Mouth position: y=${mouthPos.y.toFixed(3)}, z=${mouthPos.z.toFixed(3)}`);

    console.log('[Artigas] GLB bust loaded successfully.');
    return info;

  } catch (err) {
    console.warn('[Artigas] Could not load GLB, using placeholder geometry.', err.message || err);
    return createPlaceholderBust(scene);
  }
}

/**
 * Inspect loaded GLB meshes for morph targets, mouth/jaw meshes.
 */
function inspectGLB(rootMeshes) {
  let headMesh = null;
  let mouthMesh = null;
  let hasMorphTargets = false;
  let morphTargetNames = [];
  let allMeshes = [];
  let rootMesh = null;
  let mostVerts = 0;

  for (const m of rootMeshes) {
    if (m.getChildMeshes) {
      const children = m.getChildMeshes();
      if (children.length > 0) {
        allMeshes.push(...children);
      }
    }
    if (m instanceof BABYLON.AbstractMesh && m.geometry) {
      allMeshes.push(m);
    }
  }

  // Deduplicate
  allMeshes = [...new Set(allMeshes)];

  for (const mesh of allMeshes) {
    // Check for morph targets
    const mgr = mesh.morphTargetManager;
    if (mgr && mgr.numTargets > 0) {
      hasMorphTargets = true;
      for (let i = 0; i < mgr.numTargets; i++) {
        const target = mgr.getTarget(i);
        if (target) {
          morphTargetNames.push(target.name);
        }
      }
    }

    // Check for mouth/jaw named mesh
    const name = (mesh.name || '').toLowerCase();
    if (name.includes('mouth') || name.includes('jaw') || name.includes('boca') ||
        name.includes('mandibula') || name.includes('lips') || name.includes('labio')) {
      mouthMesh = mesh;
    }

    // Track largest mesh as head
    const vc = getVertexCount(mesh);
    if (vc > mostVerts) {
      mostVerts = vc;
      headMesh = mesh;
    }
  }

  // Find root (first parent that's a transform node)
  rootMesh = rootMeshes[0];

  return {
    rootMesh,
    allMeshes,
    headMesh,
    mouthMesh,
    hasMorphTargets,
    morphTargetNames: [...new Set(morphTargetNames)],
  };
}

/**
 * Get vertex count for a mesh.
 */
function getVertexCount(mesh) {
  if (!mesh || !mesh.geometry) return 0;
  const pos = mesh.geometry.getVertexBuffer(BABYLON.VertexBuffer.PositionKind);
  return pos ? pos.count : 0;
}

/**
 * Center and scale the model to a good viewing size (~3.5 units tall).
 * Works with TransformNode or AbstractMesh root.
 */
function centerAndScale(root, allMeshes) {
  // Try to get bounding info from the root or its children
  let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
  let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
  let found = false;

  // First try root's own bounding info
  if (root.getBoundingInfo) {
    const bi = root.getBoundingInfo();
    if (bi) {
      min = BABYLON.Vector3.Minimize(min, bi.boundingBox.minimumWorld);
      max = BABYLON.Vector3.Maximize(max, bi.boundingBox.maximumWorld);
      found = true;
    }
  }

  // Try root's direct children
  if (root.getChildMeshes) {
    const childMeshes = root.getChildMeshes();
    for (const m of childMeshes) {
      if (m.getBoundingInfo) {
        const bi = m.getBoundingInfo();
        if (bi) {
          min = BABYLON.Vector3.Minimize(min, bi.boundingBox.minimumWorld);
          max = BABYLON.Vector3.Maximize(max, bi.boundingBox.maximumWorld);
          found = true;
        }
      }
    }
  }

  // Fallback: use allMeshes array
  if (!found && allMeshes) {
    for (const m of allMeshes) {
      if (m.getBoundingInfo) {
        const bi = m.getBoundingInfo();
        if (bi) {
          min = BABYLON.Vector3.Minimize(min, bi.boundingBox.minimumWorld);
          max = BABYLON.Vector3.Maximize(max, bi.boundingBox.maximumWorld);
          found = true;
        }
      }
    }
  }

  if (found) {
    const center = new BABYLON.Vector3(
      (min.x + max.x) / 2,
      (min.y + max.y) / 2,
      (min.z + max.z) / 2
    );
    const size = new BABYLON.Vector3(
      max.x - min.x,
      max.y - min.y,
      max.z - min.z
    );
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      root.position.subtractInPlace(center);
      const scale = 3.5 / maxDim;
      root.scaling = new BABYLON.Vector3(scale, scale, scale);
      console.log(`[Artigas] Model scaled: maxDim=${maxDim.toFixed(3)} → scale=${scale.toFixed(2)}`);
    }
  }
}

/**
 * Normalize loaded character materials for a bronze/statue look.
 * Keeps existing textures where possible and never touches decal/helper materials.
 */
function applyStatueMaterialNormalization(meshes) {
  const seenMaterials = new Set();

  console.group('[Artigas] Statue Material Setup');
  console.log('Normalize materials:', NORMALIZE_STATUE_MATERIALS);
  console.log('Bronze tint:', BRONZE_TINT.toString());

  for (const mesh of meshes) {
    const meshName = (mesh?.name || '').toLowerCase();
    if (
      meshName.includes('decal') ||
      meshName.includes('spray') ||
      meshName.includes('debug') ||
      meshName.includes('marker') ||
      meshName === 'proceduralmouth'
    ) {
      continue;
    }

    if (!mesh.material) {
      const defaultMat = new BABYLON.PBRMaterial('bronzeStatueMat', mesh.getScene());
      defaultMat.albedoColor = BRONZE_TINT.clone();
      defaultMat.reflectivityColor = WARM_HIGHLIGHT.clone();
      defaultMat.roughness = 0.58;
      defaultMat.metallic = 0.55;
      defaultMat.environmentIntensity = 0.45;
      defaultMat.backFaceCulling = false;
      mesh.material = defaultMat;
      console.log(`[Artigas] Created bronze material for mesh "${mesh.name}"`);
      continue;
    }

    const mat = mesh.material;
    if (seenMaterials.has(mat)) continue;
    seenMaterials.add(mat);

    const className = mat.getClassName();

    if (className.includes('PBR')) {
      mat.metallic = 0.58;
      mat.roughness = 0.56;
      mat.environmentIntensity = 0.45;
      mat.backFaceCulling = false;

      if (mat.albedoColor) {
        mat.albedoColor = BABYLON.Color3.Lerp(mat.albedoColor, BRONZE_TINT, 0.55);
      } else {
        mat.albedoColor = BRONZE_TINT.clone();
      }

      if (mat.reflectivityColor) {
        mat.reflectivityColor = BABYLON.Color3.Lerp(mat.reflectivityColor, WARM_HIGHLIGHT, 0.35);
      }

      console.log(`[Artigas] Normalized PBR material "${mat.name || mesh.name}"`);
    } else if (className.includes('Standard')) {
      if (mat.diffuseColor) {
        mat.diffuseColor = BABYLON.Color3.Lerp(mat.diffuseColor, BRONZE_TINT, 0.55);
      } else {
        mat.diffuseColor = BRONZE_TINT.clone();
      }
      mat.specularPower = 20;
      mat.specularColor = new BABYLON.Color3(0.22, 0.19, 0.15);
      mat.backFaceCulling = false;
      console.log(`[Artigas] Normalized Standard material "${mat.name || mesh.name}"`);
    } else {
      console.warn(`[Artigas] Unknown material type "${className}" for mesh "${mesh.name}"`);
      if (mat.diffuseColor) mat.diffuseColor = BABYLON.Color3.Lerp(mat.diffuseColor, BRONZE_TINT, 0.45);
      if (mat.albedoColor) mat.albedoColor = BABYLON.Color3.Lerp(mat.albedoColor, BRONZE_TINT, 0.45);
    }
  }

  console.log('Materials normalized:', seenMaterials.size);
  console.groupEnd();
}

/**
 * Auto-detect mouth region from the head mesh geometry.
 * Finds the front-most vertex in the lower 15-40% of Y range.
 */
function detectMouthPosition(headMesh) {
  const posBuffer = headMesh.geometry.getVertexBuffer(BABYLON.VertexBuffer.PositionKind);
  if (!posBuffer) {
    return { x: MOUTH_POS.x, y: MOUTH_POS.y, z: MOUTH_POS.z };
  }

  const data = posBuffer.getData();

  // Find Y and Z ranges
  let minY = Infinity, maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < data.length; i += 3) {
    const y = data[i + 1];
    const z = data[i + 2];
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  const yRange = maxY - minY;
  const mouthYLow = minY + yRange * 0.15;
  const mouthYHigh = minY + yRange * 0.40;

  // Find front-most vertex in mouth band
  let bestZ = -Infinity;
  let mouthY = minY + yRange * 0.25;
  for (let i = 0; i < data.length; i += 3) {
    const y = data[i + 1];
    const z = data[i + 2];
    if (y >= mouthYLow && y <= mouthYHigh && z > bestZ) {
      bestZ = z;
      mouthY = y;
    }
  }

  if (bestZ === -Infinity) {
    return { x: 0, y: mouthY, z: maxZ + 0.02 };
  }

  // Slight offset in front of face surface
  return { x: 0, y: mouthY, z: bestZ + 0.015 };
}

/**
 * Create a procedural placeholder bust when GLB is missing.
 */
function createPlaceholderBust(scene) {
  const root = new BABYLON.TransformNode('placeholderRoot');

  const mat = new BABYLON.StandardMaterial('placeholderMat', scene);
  mat.diffuseColor = new BABYLON.Color3(0.83, 0.78, 0.69);
  mat.roughness = 0.75;
  mat.specularPower = 20;

  // Head
  const head = BABYLON.MeshBuilder.CreateSphere('head', { segments: 28, diameter: 1.8 }, scene);
  head.scaling = new BABYLON.Vector3(0.85, 1.15, 0.9);
  head.position.y = 0.6;
  head.material = mat;
  head.parent = root;

  // Neck
  const neckMat = mat.clone('neckMat');
  neckMat.diffuseColor = new BABYLON.Color3(0.77, 0.72, 0.60);
  const neck = BABYLON.MeshBuilder.CreateCylinder('neck', { height: 0.6, diameterTop: 0.45, diameterBottom: 0.55 }, scene);
  neck.position.y = -0.15;
  neck.material = neckMat;
  neck.parent = root;

  // Shoulders
  const baseMat = mat.clone('baseMat');
  baseMat.diffuseColor = new BABYLON.Color3(0.72, 0.67, 0.54);
  const base = BABYLON.MeshBuilder.CreateCylinder('base', { height: 0.7, diameterTop: 1.4, diameterBottom: 1.6 }, scene);
  base.position.y = -0.55;
  base.material = baseMat;
  base.parent = root;

  // Nose
  const nose = BABYLON.MeshBuilder.CreateBox('nose', { width: 0.12, height: 0.35, depth: 0.2 }, scene);
  nose.position.set(0, 0.7, 0.88);
  nose.material = mat;
  nose.parent = root;

  // Eyes
  const eyeMat = new BABYLON.StandardMaterial('eyeMat', scene);
  eyeMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.18);
  const browMat = mat.clone('browMat');
  browMat.diffuseColor = new BABYLON.Color3(0.73, 0.66, 0.54);

  [-1, 1].forEach((side) => {
    const eye = BABYLON.MeshBuilder.CreateSphere('eye', { diameter: 0.1 }, scene);
    eye.scaling = new BABYLON.Vector3(1.2, 1, 0.5);
    eye.position.set(side * 0.28, 0.74, 0.85);
    eye.material = eyeMat;
    eye.parent = root;

    const brow = BABYLON.MeshBuilder.CreateBox('brow', { width: 0.2, height: 0.04, depth: 0.1 }, scene);
    brow.position.set(side * 0.28, 0.84, 0.82);
    brow.material = browMat;
    brow.parent = root;
  });

  // Mouth (thin dark box)
  const mouthMat = new BABYLON.StandardMaterial('mouthMat', scene);
  mouthMat.diffuseColor = new BABYLON.Color3(0.18, 0.08, 0.08);
  const mouth = BABYLON.MeshBuilder.CreateBox('mouth', { width: 0.2, height: 0.035, depth: 0.05 }, scene);
  mouth.position.set(0, 0.45, 0.88);
  mouth.material = mouthMat;
  mouth.parent = root;

  // Hair
  const hairMat = new BABYLON.StandardMaterial('hairMat', scene);
  hairMat.diffuseColor = new BABYLON.Color3(0.16, 0.12, 0.09);
  const hair = BABYLON.MeshBuilder.CreateSphere('hair', { segments: 16, diameter: 1.7 }, scene);
  hair.scaling = new BABYLON.Vector3(0.88, 0.55, 0.85);
  hair.position.set(0, 1.15, 0.55);
  hair.material = hairMat;
  hair.parent = root;

  // Military collar
  const collarMat = new BABYLON.StandardMaterial('collarMat', scene);
  collarMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.16);
  const collar = BABYLON.MeshBuilder.CreateTorus('collar', { diameter: 1.1, thickness: 0.05, tessellation: 24 }, scene);
  collar.position.set(0, -0.05, 0.3);
  collar.rotation.x = Math.PI / 6;
  collar.scaling = new BABYLON.Vector3(1.2, 1, 0.8);
  collar.material = collarMat;
  collar.parent = root;

  // Center and scale
  const bbox = root.getBoundingInfo();
  if (bbox) {
    const center = bbox.boundingBox.center;
    root.position.subtractInPlace(center);
  }

  console.log('[Artigas] Placeholder bust created with procedural geometry.');

  const allMeshes = [];
  root.getChildMeshes().forEach((m) => allMeshes.push(m));

  return {
    rootMesh: root,
    allMeshes,
    headMesh: head,
    mouthMesh: mouth,
    hasMorphTargets: false,
    morphTargetNames: [],
    isPlaceholder: true,
    mouthPosition: { x: 0, y: 0.45, z: 0.90 },
  };
}
