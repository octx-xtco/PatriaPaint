/**
 * Audio playback manager using Web Audio API.
 *
 * Creates a single persistent AudioContext and AnalyserNode.
 * Reuses the same <audio> element across song changes (no
 * duplicate MediaElementSourceNodes).
 *
 * Provides amplitude data for lipsync via getAmplitude().
 */

const DEBUG_AUDIO = false;

export function createAudioManager() {
  let audioContext = null;
  let audioElement = null;
  let sourceNode = null;
  let analyserNode = null;
  let gainNode = null;
  let isPlaying = false;
  let currentSrc = '';
  let currentVolume = 0.7;
  let muted = false;
  const endedCallbacks = new Set();

  // Amplitude smoothing state
  let amplitude = 0;
  let smoothedAmplitude = 0;
  let debugLogOnce = false;

  async function ensureContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  }

  async function ensureAudioElement() {
    await ensureContext();
    if (audioElement) return audioElement;

    audioElement = new Audio();
    audioElement.crossOrigin = 'anonymous';
    audioElement.preload = 'auto';

    // Create the graph ONCE: element -> analyser -> gain -> destination.
    sourceNode = audioContext.createMediaElementSource(audioElement);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 1024;

    gainNode = audioContext.createGain();
    gainNode.gain.value = muted ? 0 : currentVolume;

    sourceNode.connect(analyserNode);
    analyserNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    audioElement.addEventListener('ended', () => {
      isPlaying = false;
      debugLogOnce = false;
      for (const callback of endedCallbacks) {
        callback();
      }
    });

    return audioElement;
  }

  async function load(src) {
    const element = await ensureAudioElement();
    element.pause();
    currentSrc = src;
    element.src = src;
    element.load();
    element.currentTime = 0;
    isPlaying = false;

    amplitude = 0;
    smoothedAmplitude = 0;
    debugLogOnce = false;
  }

  async function play() {
    if (!audioElement) return false;
    await ensureContext();

    try {
      await audioElement.play();
      isPlaying = true;
      debugLogOnce = false;

      if (DEBUG_AUDIO) {
        console.group('[Audio] Play started');
        console.log('  src:', audioElement.src);
        console.log('  AudioContext.state:', audioContext.state);
        console.log('  Analyser fftSize:', analyserNode ? analyserNode.fftSize : 'none');
        console.log('  Analyser frequencyBinCount:', analyserNode ? analyserNode.frequencyBinCount : 'none');
        console.groupEnd();
      }

      return true;
    } catch (err) {
      console.warn('[Audio] Play failed:', err.message);
      isPlaying = false;
      throw err;
    }
  }

  function pause() {
    if (audioElement) {
      audioElement.pause();
      isPlaying = false;
    }
    debugLogOnce = false;
  }

  function stop() {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      isPlaying = false;
    }
    amplitude = 0;
    smoothedAmplitude = 0;
    debugLogOnce = false;
  }

  function togglePlayPause() {
    if (isPlaying) {
      pause();
    } else if (audioElement && currentSrc) {
      play();
    }
    return isPlaying;
  }

  function setVolume(val) {
    currentVolume = Math.max(0, Math.min(1, val));
    if (gainNode) {
      gainNode.gain.value = muted ? 0 : currentVolume;
    }
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    if (gainNode) {
      gainNode.gain.value = muted ? 0 : currentVolume;
    }
  }

  function seek(time) {
    if (audioElement) {
      audioElement.currentTime = time;
    }
  }

  function getCurrentTime() {
    return audioElement ? audioElement.currentTime : 0;
  }

  function getDuration() {
    return audioElement ? (audioElement.duration || 0) : 0;
  }

  /**
   * Returns smoothed RMS amplitude (0–1).
   * Uses time-domain data from the AnalyserNode.
   * Decays smoothly when paused.
   */
  function getAmplitude() {
    if (!analyserNode || !isPlaying) {
      // Smooth decay to zero when not playing
      smoothedAmplitude += (0 - smoothedAmplitude) * 0.18;
      if (smoothedAmplitude < 0.001) smoothedAmplitude = 0;
      return smoothedAmplitude;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteTimeDomainData(dataArray);

    // RMS calculation
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = (dataArray[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / bufferLength);

    // Amplify raw RMS for visible mouth movement
    const rawAmplitude = Math.min(1, rms * 4.5);

    // Smooth
    smoothedAmplitude += (rawAmplitude - smoothedAmplitude) * 0.22;

    // Debug log once per second when playing
    if (DEBUG_AUDIO && !debugLogOnce) {
      debugLogOnce = true;
      console.log('[Audio] First amplitude sample:', {
        rms: rms.toFixed(4),
        rawAmplitude: rawAmplitude.toFixed(4),
        smoothedAmplitude: smoothedAmplitude.toFixed(4),
        isPlaying,
        audioCtxState: audioContext?.state,
      });
    }

    return smoothedAmplitude;
  }

  function getPlaying() {
    return isPlaying;
  }

  function getCurrentSrc() {
    return currentSrc;
  }

  function onEnded(callback) {
    endedCallbacks.add(callback);
    return () => endedCallbacks.delete(callback);
  }

  return {
    load,
    play,
    pause,
    stop,
    togglePlayPause,
    setVolume,
    setMuted,
    seek,
    getCurrentTime,
    getDuration,
    getAmplitude,
    getPlaying,
    getCurrentSrc,
    getMuted: () => muted,
    onEnded,
  };
}
