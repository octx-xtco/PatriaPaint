/**
 * Side controls panel for Artigas Canta.
 * Includes statue selection, graffiti tools, playlist radio controls, and capture.
 */

const FIRST_INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart'];

export function createControls(audioManager, onSongChange, graffitiSystem, appTools = {}) {
  const container = document.createElement('div');
  container.id = 'controls';
  container.className = 'controls-panel';

  const playlist = appTools.playlist || [];
  const collaborationTools = appTools.collaboration || null;
  let currentTrackIndex = 0;
  let musicStarted = false;
  let musicActivationPending = false;
  let muted = false;
  let collaborationState = {
    enabled: false,
    status: 'local',
    userCount: 0,
  };

  // Title
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = 'Artigas Canta';
  container.appendChild(title);

  // --- Character selector ---
  if (appTools.characters?.length) {
    const statueTitle = document.createElement('div');
    statueTitle.className = 'subtitle';
    statueTitle.textContent = 'Estatua';
    container.appendChild(statueTitle);

    const statueRow = document.createElement('div');
    statueRow.className = 'row';

    const statueLabel = document.createElement('label');
    statueLabel.textContent = 'Elegir';
    statueRow.appendChild(statueLabel);

    const statueSelect = document.createElement('select');
    statueSelect.id = 'statue-select';
    appTools.characters.forEach((character) => {
      const opt = document.createElement('option');
      opt.value = character.id;
      opt.textContent = character.name;
      statueSelect.appendChild(opt);
    });
    statueSelect.value = appTools.activeCharacterId || appTools.characters[0].id;
    statueRow.appendChild(statueSelect);
    container.appendChild(statueRow);

    statueSelect.addEventListener('change', async () => {
      const previousValue = appTools.activeCharacterId || appTools.characters[0].id;
      statueSelect.disabled = true;
      const ok = await appTools.onCharacterChange?.(statueSelect.value);
      if (!ok) {
        statueSelect.value = previousValue;
      } else {
        appTools.activeCharacterId = statueSelect.value;
        if (graffitiSystem) {
          setSprayButtonActive(false);
        }
      }
      statueSelect.disabled = false;
    });
  }

  // --- Graffiti section ---
  let setSprayButtonActive = () => {};

  if (graffitiSystem) {
    const sep = document.createElement('div');
    sep.className = 'separator';
    container.appendChild(sep);

    const grafTitle = document.createElement('div');
    grafTitle.className = 'subtitle';
    grafTitle.textContent = 'Graffiti';
    container.appendChild(grafTitle);

    const grafRow = document.createElement('div');
    grafRow.className = 'row';

    const sprayBtn = document.createElement('button');
    sprayBtn.id = 'spray-btn';
    sprayBtn.textContent = 'Modo spray';
    sprayBtn.className = 'graf-btn';

    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-btn';
    clearBtn.textContent = 'Limpiar pintura';
    clearBtn.className = 'graf-btn';

    grafRow.appendChild(sprayBtn);
    grafRow.appendChild(clearBtn);
    container.appendChild(grafRow);

    const colorRow = document.createElement('div');
    colorRow.className = 'row color-row';

    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Color';
    colorRow.appendChild(colorLabel);

    const colorSwatches = document.createElement('div');
    colorSwatches.className = 'color-swatches';

    graffitiSystem.getColors().forEach((c, i) => {
      const swatch = document.createElement('button');
      swatch.className = 'color-swatch';
      if (i === 0) swatch.classList.add('active');
      swatch.style.backgroundColor = c.hex;
      swatch.title = c.name;
      swatch.addEventListener('click', () => {
        colorSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        graffitiSystem.setColor(i);
      });
      colorSwatches.appendChild(swatch);
    });
    colorRow.appendChild(colorSwatches);
    container.appendChild(colorRow);

    const sizeRow = document.createElement('div');
    sizeRow.className = 'row';

    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = 'Tamaño';
    sizeRow.appendChild(sizeLabel);

    const sizeSlider = document.createElement('input');
    sizeSlider.type = 'range';
    sizeSlider.id = 'size-slider';
    sizeSlider.min = 0.02;
    sizeSlider.max = 0.25;
    sizeSlider.step = 0.01;
    sizeSlider.value = 0.06;
    sizeRow.appendChild(sizeSlider);
    container.appendChild(sizeRow);

    let sprayActive = false;
    setSprayButtonActive = (active) => {
      sprayActive = active;
      graffitiSystem.setSprayMode(active);
      sprayBtn.classList.toggle('active', active);
      sprayBtn.textContent = active ? 'Spray ON' : 'Modo spray';
      document.body.style.cursor = active ? 'crosshair' : '';
    };

    sprayBtn.addEventListener('click', () => {
      sprayActive = !sprayActive;
      setSprayButtonActive(sprayActive);
    });

    clearBtn.addEventListener('click', () => {
      if (appTools.onClearGraffiti) {
        appTools.onClearGraffiti();
      } else {
        graffitiSystem.clearAll();
      }
    });

    sizeSlider.addEventListener('input', () => {
      graffitiSystem.setSize(parseFloat(sizeSlider.value));
    });
  }

  // --- Collaboration section ---
  let updateCollaborationUI = () => {};
  if (collaborationTools) {
    const collabSep = document.createElement('div');
    collabSep.className = 'separator';
    container.appendChild(collabSep);

    const collabTitle = document.createElement('div');
    collabTitle.className = 'subtitle';
    collabTitle.textContent = 'Colaborativo';
    container.appendChild(collabTitle);

    const collabRow = document.createElement('div');
    collabRow.className = 'row';

    const collabBtn = document.createElement('button');
    collabBtn.id = 'collab-btn';
    collabBtn.className = 'graf-btn';
    collabRow.appendChild(collabBtn);
    container.appendChild(collabRow);

    const collabStatus = document.createElement('div');
    collabStatus.id = 'collab-status';
    collabStatus.className = 'track-display';
    container.appendChild(collabStatus);

    updateCollaborationUI = () => {
      collabBtn.textContent = collaborationState.enabled ? 'Colaborativo ON' : 'Modo colaborativo';
      collabBtn.classList.toggle('active', collaborationState.enabled);
      collabStatus.textContent =
        `Estado: ${collaborationState.status} · Usuarios en esta estatua: ${collaborationState.userCount}`;
    };

    collabBtn.addEventListener('click', () => {
      collaborationState.enabled = !collaborationState.enabled;
      collaborationState.status = collaborationState.enabled ? 'conectando' : 'local';
      collaborationState.userCount = collaborationState.enabled ? collaborationState.userCount : 0;
      updateCollaborationUI();
      collaborationTools.onToggle?.(collaborationState.enabled);
    });

    updateCollaborationUI();
  }

  // --- Music section ---
  const musicSep = document.createElement('div');
  musicSep.className = 'separator';
  container.appendChild(musicSep);

  const musicTitle = document.createElement('div');
  musicTitle.className = 'subtitle';
  musicTitle.textContent = 'Música';
  container.appendChild(musicTitle);

  const trackDisplay = document.createElement('div');
  trackDisplay.id = 'current-track';
  trackDisplay.className = 'track-display';
  container.appendChild(trackDisplay);

  const musicRow = document.createElement('div');
  musicRow.className = 'row';

  const muteBtn = document.createElement('button');
  muteBtn.id = 'mute-btn';
  muteBtn.className = 'graf-btn';
  muteBtn.textContent = 'Mute';

  const nextBtn = document.createElement('button');
  nextBtn.id = 'next-track-btn';
  nextBtn.className = 'graf-btn';
  nextBtn.textContent = 'Siguiente tema';

  musicRow.appendChild(muteBtn);
  musicRow.appendChild(nextBtn);
  container.appendChild(musicRow);

  const activateBtn = document.createElement('button');
  activateBtn.id = 'activate-music-btn';
  activateBtn.className = 'graf-btn music-activate';
  activateBtn.textContent = 'Activar música';
  container.appendChild(activateBtn);

  function getCurrentTrack() {
    return playlist[currentTrackIndex] || null;
  }

  function updateMusicUI() {
    const track = getCurrentTrack();
    const currentTime = audioManager.getCurrentTime();
    const duration = audioManager.getDuration();
    const progressText = duration > 0
      ? ` · ${formatTime(currentTime)} / ${formatTime(duration)}`
      : '';

    trackDisplay.textContent = track
      ? `Tema actual: ${track.name}${progressText}`
      : 'Tema actual: Sin canciones';

    muteBtn.textContent = muted ? 'Sonido' : 'Mute';
    activateBtn.style.display = musicStarted || playlist.length === 0 ? 'none' : 'flex';
    nextBtn.disabled = playlist.length <= 1 || musicActivationPending;
    muteBtn.disabled = playlist.length === 0;
  }

  async function playTrack(index) {
    if (playlist.length === 0 || musicActivationPending) return false;
    musicActivationPending = true;
    currentTrackIndex = ((index % playlist.length) + playlist.length) % playlist.length;
    const track = getCurrentTrack();

    try {
      await audioManager.load(track.file);
      audioManager.setMuted(muted);
      audioManager.setVolume(0.7);
      await audioManager.play();
      musicStarted = true;
      if (onSongChange) onSongChange(track);
      updateMusicUI();
      return true;
    } catch (err) {
      musicStarted = false;
      activateBtn.style.display = 'flex';
      console.warn('[Artigas] Music activation failed:', err.message || err);
      updateMusicUI();
      return false;
    } finally {
      musicActivationPending = false;
      updateMusicUI();
    }
  }

  function activateMusic() {
    if (!musicStarted && !musicActivationPending) {
      void playTrack(currentTrackIndex);
    }
  }

  for (const eventName of FIRST_INTERACTION_EVENTS) {
    window.addEventListener(eventName, activateMusic, { once: true, capture: true });
  }

  audioManager.onEnded(() => {
    if (musicStarted && playlist.length > 0) {
      void playTrack(currentTrackIndex + 1);
    }
  });

  activateBtn.addEventListener('click', () => {
    void playTrack(currentTrackIndex);
  });

  muteBtn.addEventListener('click', () => {
    muted = !muted;
    audioManager.setMuted(muted);
    updateMusicUI();
    if (!musicStarted) {
      activateMusic();
    }
  });

  nextBtn.addEventListener('click', () => {
    void playTrack(currentTrackIndex + 1);
  });

  updateMusicUI();

  // --- Capture section ---
  if (appTools.onCapture) {
    const sep = document.createElement('div');
    sep.className = 'separator';
    container.appendChild(sep);

    const captureTitle = document.createElement('div');
    captureTitle.className = 'subtitle';
    captureTitle.textContent = 'Captura';
    container.appendChild(captureTitle);

    const captureRow = document.createElement('div');
    captureRow.className = 'row';

    const captureBtn = document.createElement('button');
    captureBtn.id = 'capture-btn';
    captureBtn.textContent = 'Sacar foto';
    captureBtn.className = 'graf-btn';
    captureBtn.addEventListener('click', () => {
      appTools.onCapture();
    });
    captureRow.appendChild(captureBtn);
    container.appendChild(captureRow);
  }

  document.body.appendChild(container);

  const instruction = document.createElement('div');
  instruction.id = 'instruction';
  instruction.textContent = 'Arrastrá la cara con el cursor.';
  document.body.appendChild(instruction);

  setTimeout(() => {
    instruction.style.opacity = '0';
  }, 5000);

  function formatTime(secs) {
    if (!secs || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updateUI() {
    updateMusicUI();
    updateCollaborationUI();
  }

  return {
    updateUI,
    setCollaborationState(nextState = {}) {
      collaborationState = {
        ...collaborationState,
        ...nextState,
      };
      updateCollaborationUI();
    },
  };
}
