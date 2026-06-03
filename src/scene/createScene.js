import * as BABYLON from '@babylonjs/core';

const HARDWARE_SCALING_LEVEL = 1.5;

/**
 * Creates and returns the Babylon.js engine, scene, camera, and lighting.
 * Uses ArcRotateCamera for orbit/zoom/pinch interaction.
 */
export function createScene() {
  const canvas = document.getElementById('app');
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
  });
  engine.setHardwareScalingLevel(HARDWARE_SCALING_LEVEL);

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.005, 0.006, 0.008, 1);
  scene.environmentIntensity = 0.35;

  // ArcRotateCamera — user can orbit (drag), zoom (wheel), pinch (touch)
  // alpha: horizontal orbit, beta: vertical orbit, radius: zoom distance
  const camera = new BABYLON.ArcRotateCamera(
    'camera',
    Math.PI / 2,           // alpha — start slightly to the side
    Math.PI / 2.1,         // beta — slightly above head-on
    4,                     // radius (zoom distance)
    new BABYLON.Vector3(0, 0.3, 0), // target — centered slightly above origin
    scene
  );

  // Attach mouse/touch controls to canvas
  camera.attachControl(canvas, true);

  // Zoom limits — prevent losing the model
  camera.lowerRadiusLimit = 1.8;
  camera.upperRadiusLimit = 8;
  camera.wheelPrecision = 50;
  camera.pinchPrecision = 80;

  // Smooth movement
  camera.inertia = 0.75;
  camera.angularSensibilityX = 1200;
  camera.angularSensibilityY = 1200;

  // Prevent camera from going below the model (floor limit)
  camera.lowerBetaLimit = 0.6;
  camera.upperBetaLimit = Math.PI * 0.8;

  // Ambient fill: keeps shadows readable without flattening the model.
  const hemiLight = new BABYLON.HemisphericLight(
    'hemiLight',
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  hemiLight.intensity = 0.45;
  hemiLight.diffuse = new BABYLON.Color3(0.82, 0.84, 0.88);
  hemiLight.groundColor = new BABYLON.Color3(0.1, 0.085, 0.07);

  // Warm key light from front-left.
  const keyLight = new BABYLON.DirectionalLight(
    'keyLight',
    new BABYLON.Vector3(-0.45, -0.85, -0.35),
    scene
  );
  keyLight.intensity = 1.15;
  keyLight.diffuse = new BABYLON.Color3(1.0, 0.92, 0.82);
  keyLight.specular = new BABYLON.Color3(0.28, 0.24, 0.2);

  // Cool rim light from rear-right for silhouette separation.
  const rimLight = new BABYLON.DirectionalLight(
    'rimLight',
    new BABYLON.Vector3(0.6, -0.35, 0.75),
    scene
  );
  rimLight.intensity = 0.5;
  rimLight.diffuse = new BABYLON.Color3(0.55, 0.7, 1.0);
  rimLight.specular = new BABYLON.Color3(0.08, 0.1, 0.14);

  // Weak neutral fill for facial readability.
  const fillLight = new BABYLON.DirectionalLight(
    'fillLight',
    new BABYLON.Vector3(0.4, -0.55, -0.25),
    scene
  );
  fillLight.intensity = 0.22;
  fillLight.diffuse = new BABYLON.Color3(0.72, 0.72, 0.68);

  console.log('Lighting: shadows disabled for stable statue presentation');
  console.group('Lighting Setup');
  console.log('Hemi intensity:', hemiLight.intensity);
  console.log('Key intensity:', keyLight.intensity);
  console.log('Rim intensity:', rimLight.intensity);
  console.log('Fill intensity:', fillLight.intensity);
  console.log('Shadows enabled:', false);
  console.log('Normalize materials:', true);
  console.groupEnd();

  // Handle resize
  window.addEventListener('resize', () => {
    engine.resize();
  });

  return { engine, scene, camera, canvas };
}
