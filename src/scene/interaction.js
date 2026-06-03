/**
 * Subtle cursor-reactive bust rotation.
 * Does NOT conflict with ArcRotateCamera orbit/zoom.
 *
 * When the user hovers (not dragging), the bust subtly follows the pointer.
 * When the user is orbiting (pointer down), cursor reaction pauses.
 */

const MAX_Y_ROTATION = 0.12;   // subtle horizontal sway
const MAX_X_ROTATION = 0.06;   // very subtle vertical nod
const DAMPING = 0.06;
const IDLE_TIMEOUT_MS = 3000;

export function createCursorRotation(canvas, bustGroup) {
  let targetBustGroup = bustGroup;
  let targetRotY = 0;
  let targetRotX = 0;
  let currentRotY = 0;
  let currentRotX = 0;
  let lastMoveTime = performance.now();
  let isIdle = false;
  let isOrbiting = false;
  let frozen = false;

  // Track pointer position (normalised -1 to 1)
  let pointerX = 0;
  let pointerY = 0;

  // Detect when user is actively orbiting (pointer down on canvas)
  canvas.addEventListener('pointerdown', () => {
    if (!frozen) isOrbiting = true;
  });

  canvas.addEventListener('pointerup', () => {
    isOrbiting = false;
  });

  canvas.addEventListener('pointercancel', () => {
    isOrbiting = false;
  });

  // Track pointer position for subtle bust reaction
  canvas.addEventListener('pointermove', (evt) => {
    if (frozen) return;
    pointerX = (evt.clientX / window.innerWidth) * 2 - 1;
    pointerY = (evt.clientY / window.innerHeight) * 2 - 1;
    lastMoveTime = performance.now();
    isIdle = false;
  });

  function update() {
    if (frozen) return;

    const now = performance.now();

    // Idle detection
    if (now - lastMoveTime > IDLE_TIMEOUT_MS && !isIdle) {
      isIdle = true;
    }

    // Only compute target when not orbiting
    if (!isOrbiting) {
      targetRotY = pointerX * MAX_Y_ROTATION;
      targetRotX = -pointerY * MAX_X_ROTATION;
    }

    // Idle: slowly return to center
    if (isIdle) {
      targetRotY *= 0.95;
      targetRotX *= 0.95;
    }

    // Smooth interpolation
    currentRotY += (targetRotY - currentRotY) * DAMPING;
    currentRotX += (targetRotX - currentRotX) * DAMPING;

    // Apply to bust group
    if (targetBustGroup) {
      targetBustGroup.rotation.y = currentRotY;
      targetBustGroup.rotation.x = currentRotX;
    }
  }

  return {
    update,
    freeze: (val) => {
      frozen = val;
      isOrbiting = val;
      if (!val) {
        lastMoveTime = performance.now();
        isIdle = false;
      }
    },
    setTarget: (nextBustGroup) => {
      targetBustGroup = nextBustGroup;
      targetRotY = 0;
      targetRotX = 0;
      currentRotY = 0;
      currentRotX = 0;
    },
  };
}
