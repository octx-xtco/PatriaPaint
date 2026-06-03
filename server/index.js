import { createServer } from 'node:http';
import { Server } from 'socket.io';

const PORT = Number(process.env.SOCKET_PORT || 3001);
const HOST = process.env.SOCKET_HOST || '127.0.0.1';
const MAX_SERVER_DECALS_PER_STATUE = 2000;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});

const roomState = new Map();

function roomName(statueId) {
  return `statue:${statueId}`;
}

function getState(statueId) {
  if (!roomState.has(statueId)) {
    roomState.set(statueId, []);
  }
  return roomState.get(statueId);
}

function sanitizeVector(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  return { x, y, z };
}

function sanitizeDecal(decal, statueId) {
  if (!decal || typeof decal !== 'object') return null;
  const point = sanitizeVector(decal.point);
  const normal = sanitizeVector(decal.normal);
  if (!point || !normal) return null;

  const size = Math.max(0.01, Math.min(0.45, Number(decal.size) || 0.06));
  const angle = Number.isFinite(Number(decal.angle)) ? Number(decal.angle) : 0;
  const color = typeof decal.color === 'string' ? decal.color.slice(0, 16) : '#111111';
  const meshName = typeof decal.meshName === 'string' ? decal.meshName.slice(0, 160) : '';

  return {
    statueId,
    meshName,
    point,
    normal,
    color,
    size,
    angle,
    timestamp: Number(decal.timestamp) || Date.now(),
  };
}

function normalizeSprayPayload(payload) {
  if (!payload || typeof payload !== 'object' || !payload.statueId) return null;
  const statueId = String(payload.statueId);
  const decals = Array.isArray(payload.decals) ? payload.decals : [payload];
  const sanitized = decals
    .map(decal => sanitizeDecal(decal, statueId))
    .filter(Boolean);

  if (sanitized.length === 0) return null;
  return { statueId, decals: sanitized };
}

function emitUserCount(statueId) {
  const room = roomName(statueId);
  const count = io.sockets.adapter.rooms.get(room)?.size || 0;
  io.to(room).emit('userCount', { statueId, count });
}

io.on('connection', (socket) => {
  socket.data.statueId = null;

  socket.on('joinStatue', (payload = {}) => {
    const nextStatueId = String(payload.statueId || '').trim();
    if (!nextStatueId) return;

    const previousStatueId = socket.data.statueId;
    if (previousStatueId && previousStatueId !== nextStatueId) {
      socket.leave(roomName(previousStatueId));
      emitUserCount(previousStatueId);
    }

    socket.data.statueId = nextStatueId;
    socket.join(roomName(nextStatueId));
    socket.emit('stateSnapshot', {
      statueId: nextStatueId,
      decals: getState(nextStatueId),
    });
    emitUserCount(nextStatueId);
  });

  socket.on('leaveStatue', (payload = {}) => {
    const statueId = String(payload.statueId || socket.data.statueId || '').trim();
    if (!statueId) return;
    socket.leave(roomName(statueId));
    if (socket.data.statueId === statueId) {
      socket.data.statueId = null;
    }
    emitUserCount(statueId);
  });

  socket.on('requestState', (payload = {}) => {
    const statueId = String(payload.statueId || socket.data.statueId || '').trim();
    if (!statueId) return;
    socket.emit('stateSnapshot', {
      statueId,
      decals: getState(statueId),
    });
  });

  socket.on('sprayDecal', (payload) => {
    const normalized = normalizeSprayPayload(payload);
    if (!normalized) return;

    const state = getState(normalized.statueId);
    state.push(...normalized.decals);
    while (state.length > MAX_SERVER_DECALS_PER_STATUE) {
      state.shift();
    }

    socket.to(roomName(normalized.statueId)).emit('sprayDecal', normalized);
  });

  socket.on('clearGraffiti', (payload = {}) => {
    const statueId = String(payload.statueId || socket.data.statueId || '').trim();
    if (!statueId) return;
    roomState.set(statueId, []);
    socket.to(roomName(statueId)).emit('clearGraffiti', { statueId });
  });

  socket.on('disconnect', () => {
    if (socket.data.statueId) {
      emitUserCount(socket.data.statueId);
    }
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[Artigas Socket] listening on http://${HOST}:${PORT}`);
});
