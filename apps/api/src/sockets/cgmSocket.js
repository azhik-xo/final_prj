const { Server } = require('socket.io');
const aiService = require('../services/ai.service');

let ioInstance = null;
const rollingReadings = [];

function broadcastReading(reading) {
  if (ioInstance) {
    ioInstance.emit('cgm:reading', reading);
  }
}

function broadcastStatus(status) {
  if (ioInstance) {
    ioInstance.emit('cgm:status', status);
  }
}

function broadcastEvent(eventData) {
  if (ioInstance) {
    ioInstance.emit('cgm:event', eventData);
  }
}

function broadcastPrediction(prediction) {
  if (ioInstance) {
    ioInstance.emit('cgm:prediction', prediction);
  }
}

/**
 * Initializes Socket.IO on the HTTP server.
 *
 * @param {import('node:http').Server} httpServer - Node.js HTTP server instance
 * @param {string} [corsOrigin] - Allowed CORS origin
 * @returns {Server} Socket.IO server instance
 */
function initSocket(httpServer, corsOrigin) {
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

    // Lazy load simulator service to prevent circular dependencies
    const simulatorService = require('../services/simulator.service');

    // Send current status & latest reading immediately to new client
    socket.emit('cgm:status', simulatorService.getStatus());
    const latest = simulatorService.getLatestReading();
    if (latest) {
      socket.emit('cgm:reading', latest);
    }

    // Send latest AI prediction if available
    if (rollingReadings.length > 0) {
      aiService.getPrediction(rollingReadings)
        .then((pred) => socket.emit('cgm:prediction', pred))
        .catch(() => {});
    }

    // Support bidirectional controls over WebSocket
    socket.on('simulator:start', (data) => {
      try {
        const { personaId, intervalMs } = data || {};
        simulatorService.start(personaId, { intervalMs });
      } catch (err) {
        socket.emit('simulator:error', { message: err.message });
      }
    });

    socket.on('simulator:pause', () => {
      simulatorService.pause();
    });

    socket.on('simulator:resume', () => {
      simulatorService.resume();
    });

    socket.on('simulator:stop', () => {
      simulatorService.stop();
    });

    socket.on('simulator:inject', (data) => {
      try {
        const { eventType, params } = data || {};
        simulatorService.injectEvent(eventType, params);
      } catch (err) {
        socket.emit('simulator:error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Returns active Socket.IO server instance.
 * @returns {Server|null}
 */
function getIO() {
  return ioInstance;
}

module.exports = {
  initSocket,
  initCgmSocket: initSocket,
  getIO,
  broadcastReading: (reading) => {
    broadcastReading(reading);
    rollingReadings.push(reading);
    if (rollingReadings.length > 30) rollingReadings.shift();

    // Generate and broadcast AI predictions
    aiService.getPrediction(rollingReadings, [15, 30, 45], reading.persona || 'VP-01')
      .then((pred) => {
        broadcastPrediction(pred);
      })
      .catch((err) => {
        console.warn('[Socket] Prediction error:', err.message);
      });
  },
  broadcastStatus,
  broadcastEvent,
  broadcastPrediction
};
