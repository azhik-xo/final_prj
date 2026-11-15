const { Server } = require('socket.io');
const GlucoseReading = require('../models/glucoseReading.model');

let ioInstance = null;

/**
 * Initializes Socket.IO on the HTTP server and wires up SimulatorEngine events.
 *
 * @param {import('node:http').Server} httpServer - Node.js HTTP server instance
 * @param {string} [corsOrigin] - Allowed CORS origin
 * @param {object} [simulatorService] - Simulator singleton service
 * @returns {Server} Socket.IO server instance
 */
function initCgmSocket(httpServer, corsOrigin, simulatorService) {
  const io = new Server(httpServer, {
    cors: {
      origin: [corsOrigin || '*', 'http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  ioInstance = io;

  // Client connection lifecycle
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Allow subscribing to specific device or patient rooms
    socket.on('subscribe:device', (deviceId) => {
      if (deviceId) {
        socket.join(`device:${deviceId}`);
      }
    });

    socket.on('unsubscribe:device', (deviceId) => {
      if (deviceId) {
        socket.leave(`device:${deviceId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Broadcasts a reading to all connected Socket.IO clients.
 */
function broadcastReading(reading) {
  if (ioInstance) {
    ioInstance.emit('cgm:reading', reading);
    if (reading && reading.deviceId) {
      ioInstance.to(`device:${reading.deviceId}`).emit('cgm:reading', reading);
    }
  }
}

/**
 * Broadcasts status updates.
 */
function broadcastStatus(status) {
  if (ioInstance) {
    ioInstance.emit('cgm:status', status);
  }
}

/**
 * Broadcasts event notifications.
 */
function broadcastEvent(eventData) {
  if (ioInstance) {
    ioInstance.emit('cgm:event', eventData);
  }
}

/**
 * Returns active Socket.IO server instance.
 * @returns {Server|null}
 */
function getIO() {
  return ioInstance;
}

module.exports = {
  initCgmSocket,
  initSocket: initCgmSocket,
  getIO,
  broadcastReading,
  broadcastStatus,
  broadcastEvent
};
