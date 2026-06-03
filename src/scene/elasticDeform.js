import * as BABYLON from '@babylonjs/core';

/**
 * Elastic face drag interaction using vertex deformation.
 * Uses Babylon.js scene.pick() for hit detection.
 * Deforms vertices near hit point with spring recovery.
 */

const DEFORM_RADIUS = 0.4;
const MAX_DISPLACEMENT = 0.08;
const SPRING_RETURN = 0.92;

export function createElasticDeform(scene, rootMesh) {
  let isDragging = false;
  let isDeforming = false;
  let enabled = true;
  let targetMesh = null;
  let originalPositions = null;
  let currentDeforms = null;
  let vertexCount = 0;

  function findTargetMesh() {
    if (!rootMesh) return null;
    const meshes = [];
    rootMesh.getChildMeshes().forEach((m) => meshes.push(m));
    if (rootMesh instanceof BABYLON.AbstractMesh) {
      meshes.push(rootMesh);
    }
    let best = null;
    let mostVerts = 0;
    for (const m of meshes) {
      if (m.geometry) {
        const buf = m.geometry.getVertexBuffer(BABYLON.VertexBuffer.PositionKind);
        if (buf && buf.count > mostVerts) {
          mostVerts = buf.count;
          best = m;
        }
      }
    }
    return best;
  }

  function initDeformation(mesh) {
    const posBuf = mesh.geometry.getVertexBuffer(BABYLON.VertexBuffer.PositionKind);
    if (!posBuf) return false;
    const data = posBuf.getData();
    vertexCount = posBuf.count;
    originalPositions = new Float32Array(data);
    currentDeforms = new Float32Array(vertexCount);
    targetMesh = mesh;
    return true;
  }

  function getHitLocalPoint(event) {
    const pickInfo = scene.pick(event.clientX, event.clientY);
    if (!pickInfo || !pickInfo.hit || !pickInfo.pickedMesh) return null;
    return pickInfo.pickedPoint.clone();
  }

  function applyDeformation(localPoint) {
    if (!targetMesh || !originalPositions) return;
    const posBuf = targetMesh.geometry.getVertexBuffer(BABYLON.VertexBuffer.PositionKind);
    const data = posBuf.getData();

    const cameraPos = scene.activeCamera.position.clone();
    const meshWorldMatrix = targetMesh.getWorldMatrix();
    const invWorldMatrix = BABYLON.Matrix.Invert(meshWorldMatrix);
    const cameraLocal = BABYLON.Vector3.TransformCoordinates(cameraPos, invWorldMatrix);

    const radiusSq = DEFORM_RADIUS * DEFORM_RADIUS;

    for (let i = 0; i < vertexCount; i++) {
      const i3 = i * 3;
      const ox = originalPositions[i3];
      const oy = originalPositions[i3 + 1];
      const oz = originalPositions[i3 + 2];

      const dx = ox - localPoint.x;
      const dy = oy - localPoint.y;
      const dz = oz - localPoint.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - (dist / DEFORM_RADIUS);
        const strength = falloff * falloff;

        const pullDir = new BABYLON.Vector3(
          cameraLocal.x - localPoint.x,
          cameraLocal.y - localPoint.y,
          cameraLocal.z - localPoint.z
        ).normalize();

        const displacement = strength * MAX_DISPLACEMENT;
        currentDeforms[i] += (displacement - currentDeforms[i]) * 0.15;

        data[i3] = originalPositions[i3] + pullDir.x * currentDeforms[i];
        data[i3 + 1] = originalPositions[i3 + 1] + pullDir.y * currentDeforms[i];
        data[i3 + 2] = originalPositions[i3 + 2] + pullDir.z * currentDeforms[i];
      }
    }

    posBuf.update(data);
    targetMesh.geometry.updateVerticesDataDirectly(BABYLON.VertexBuffer.PositionKind, data, 0, vertexCount * 3);
  }

  function springBack() {
    if (!targetMesh || !originalPositions) return;
    const posBuf = targetMesh.geometry.getVertexBuffer(BABYLON.VertexBuffer.PositionKind);
    const data = posBuf.getData();
    let anyActive = false;

    for (let i = 0; i < vertexCount; i++) {
      const i3 = i * 3;
      currentDeforms[i] *= SPRING_RETURN;

      if (Math.abs(currentDeforms[i]) > 0.0001) {
        anyActive = true;
        data[i3] = originalPositions[i3] + currentDeforms[i] * 0.1;
        data[i3 + 1] = originalPositions[i3 + 1] + currentDeforms[i] * 0.1;
        data[i3 + 2] = originalPositions[i3 + 2] + currentDeforms[i] * 0.1;
      } else {
        if (data[i3] !== originalPositions[i3] ||
            data[i3 + 1] !== originalPositions[i3 + 1] ||
            data[i3 + 2] !== originalPositions[i3 + 2]) {
          data[i3] = originalPositions[i3];
          data[i3 + 1] = originalPositions[i3 + 1];
          data[i3 + 2] = originalPositions[i3 + 2];
        }
      }
    }

    if (anyActive) {
      posBuf.update(data);
      targetMesh.geometry.updateVerticesDataDirectly(BABYLON.VertexBuffer.PositionKind, data, 0, vertexCount * 3);
    }
  }

  // Event handlers
  function onPointerDown(evt) {
    if (!enabled) return;
    const pickInfo = scene.pick(evt.clientX, evt.clientY);
    if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
      const mesh = pickInfo.pickedMesh;
      if (initDeformation(mesh)) {
        isDragging = true;
        isDeforming = true;
        const localPoint = mesh.getWorldMatrix().invert().multiplyVector3(pickInfo.pickedPoint);
        // Actually, we need the mesh-local point. pickInfo.pickedPoint is in world space.
        // Let's get the local point correctly:
        const invMat = BABYLON.Matrix.Invert(mesh.getWorldMatrix());
        const localPt = BABYLON.Vector3.TransformCoordinates(pickInfo.pickedPoint, invMat);
        applyDeformation(localPt);
      }
    }
  }

  function onPointerMove(evt) {
    if (!isDragging || !targetMesh) return;
    const pickInfo = scene.pick(evt.clientX, evt.clientY);
    if (pickInfo && pickInfo.hit) {
      const invMat = BABYLON.Matrix.Invert(targetMesh.getWorldMatrix());
      const localPt = BABYLON.Vector3.TransformCoordinates(pickInfo.pickedPoint, invMat);
      applyDeformation(localPt);
    }
  }

  function onPointerUp() {
    isDragging = false;
  }

  function onPointerCancel() {
    isDragging = false;
  }

  function resetDeformationState() {
    isDragging = false;
    isDeforming = false;
    targetMesh = null;
    originalPositions = null;
    currentDeforms = null;
    vertexCount = 0;
  }

  // Register event listeners on the canvas
  const canvas = scene.getEngine().getRenderingCanvas();
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  function update() {
    if (!isDragging && isDeforming) {
      springBack();
      let settled = true;
      for (let i = 0; i < vertexCount; i++) {
        if (Math.abs(currentDeforms[i]) > 0.0001) {
          settled = false;
          break;
        }
      }
      if (settled) {
        isDeforming = false;
      }
    }
  }

  return {
    update,
    findTargetMesh,
    setEnabled: (val) => { enabled = val; },
    setRootMesh: (nextRootMesh) => {
      resetDeformationState();
      rootMesh = nextRootMesh;
    },
  };
}
