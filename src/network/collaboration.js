import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const NETWORK_SPRAY_INTERVAL_MS = 50;
const MAX_BATCH_SIZE = 24;

function isValidVector(value) {
  return value &&
    Number.isFinite(Number(value.x)) &&
    Number.isFinite(Number(value.y)) &&
    Number.isFinite(Number(value.z));
}

function normalizePayload(payload) {
  if (!payload?.statueId) return null;
  const decals = Array.isArray(payload.decals) ? payload.decals : [payload];
  const safeDecals = decals.filter(decal => isValidVector(decal?.point) && isValidVector(decal?.normal));
  if (safeDecals.length === 0) return null;
  return { statueId: payload.statueId, decals: safeDecals };
}

export function createCollaborationSystem({
  getCurrentStatueId,
  onRemoteSprayDecal,
  onRemoteClearGraffiti,
  onStateSnapshot,
  onUserCount,
  onStatusChange,
}) {
  let socket = null;
  let enabled = false;
  let connected = false;
  let currentStatueId = null;
  let sprayQueue = [];
  let flushTimer = null;

  function emitStatus(status, extra = {}) {
    onStatusChange?.({
      enabled,
      connected,
      status,
      userCount: connected ? extra.userCount : 0,
    });
  }

  function ensureSocket() {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 700,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      connected = true;
      emitStatus('conectado', { userCount: 1 });
      joinStatue(getCurrentStatueId?.());
    });

    socket.on('disconnect', () => {
      connected = false;
      onUserCount?.(0);
      emitStatus(enabled ? 'sin conexión' : 'local');
    });

    socket.on('connect_error', () => {
      connected = false;
      onUserCount?.(0);
      emitStatus('sin conexión');
    });

    socket.on('sprayDecal', (payload) => {
      if (!enabled) return;
      const normalized = normalizePayload(payload);
      if (!normalized || normalized.statueId !== getCurrentStatueId?.()) return;
      for (const decal of normalized.decals) {
        onRemoteSprayDecal?.({ ...decal, statueId: normalized.statueId });
      }
    });

    socket.on('clearGraffiti', (payload = {}) => {
      if (!enabled) return;
      if (payload.statueId !== getCurrentStatueId?.()) return;
      onRemoteClearGraffiti?.(payload.statueId);
    });

    socket.on('stateSnapshot', (payload = {}) => {
      if (!enabled || payload.statueId !== getCurrentStatueId?.()) return;
      onStateSnapshot?.(payload);
    });

    socket.on('userCount', (payload = {}) => {
      if (payload.statueId !== getCurrentStatueId?.()) return;
      onUserCount?.(Number(payload.count) || 0);
    });

    return socket;
  }

  function connect() {
    enabled = true;
    ensureSocket();
    emitStatus('conectando');
    if (!socket.connected) {
      socket.connect();
    } else {
      connected = true;
      joinStatue(getCurrentStatueId?.());
      emitStatus('conectado', { userCount: 1 });
    }
  }

  function leaveCurrentStatue() {
    if (!socket || !currentStatueId) return;
    socket.emit('leaveStatue', { statueId: currentStatueId });
    currentStatueId = null;
    onUserCount?.(0);
  }

  function disconnect() {
    flushSprayQueue();
    leaveCurrentStatue();
    enabled = false;
    connected = false;
    if (socket) {
      socket.disconnect();
    }
    emitStatus('local');
  }

  function setEnabled(nextEnabled) {
    if (nextEnabled) {
      connect();
    } else {
      disconnect();
    }
  }

  function joinStatue(statueId) {
    if (!enabled || !socket || !statueId) return;
    const nextStatueId = String(statueId);
    if (currentStatueId === nextStatueId && socket.connected) {
      socket.emit('requestState', { statueId: nextStatueId });
      return;
    }
    if (currentStatueId) {
      socket.emit('leaveStatue', { statueId: currentStatueId });
    }
    currentStatueId = nextStatueId;
    if (socket.connected) {
      socket.emit('joinStatue', { statueId: nextStatueId });
    }
  }

  function flushSprayQueue() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!enabled || !socket?.connected || sprayQueue.length === 0) return;
    const statueId = getCurrentStatueId?.();
    const decals = sprayQueue.splice(0, MAX_BATCH_SIZE);
    socket.emit('sprayDecal', { statueId, decals });
    if (sprayQueue.length > 0) {
      flushTimer = setTimeout(flushSprayQueue, NETWORK_SPRAY_INTERVAL_MS);
    }
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flushSprayQueue, NETWORK_SPRAY_INTERVAL_MS);
  }

  function sendSprayDecal(payload) {
    if (!enabled || !socket?.connected || !payload) return;
    sprayQueue.push(payload);
    scheduleFlush();
  }

  function sendClearGraffiti(statueId) {
    if (!enabled || !socket?.connected || !statueId) return;
    flushSprayQueue();
    socket.emit('clearGraffiti', { statueId });
  }

  return {
    connect,
    disconnect,
    setEnabled,
    joinStatue,
    leaveCurrentStatue,
    sendSprayDecal,
    sendClearGraffiti,
    isEnabled: () => enabled,
    isConnected: () => connected,
  };
}
