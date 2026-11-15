/**
 * GlucoGuard API & Real-Time Gateway Server (Module M2)
 *
 * Bootstraps HTTP server, MongoDB Atlas database connection,
 * and Socket.IO real-time telemetry gateway.
 *
 * @module server
 */

const http = require('node:http');
const app = require('./app');
const config = require('./config');
const { connectDB, disconnectDB } = require('./config/db');
const { initSocket } = require('./sockets/cgmSocket');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO Telemetry Gateway
initSocket(server, config.corsOrigin);

// Bootstrap Server & Database
async function startServer() {
  try {
    // Connect to MongoDB Atlas
    await connectDB();
  } catch (dbErr) {
    console.warn('[Server] MongoDB connection deferred or failed. In-memory simulator will continue:', dbErr.message);
  }

  server.listen(config.port, () => {
    console.log(`[GlucoGuard API] Server running in ${config.nodeEnv} mode on port ${config.port}`);
    console.log(`[GlucoGuard API] Simulation Mode: ${config.simulationMode ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`[GlucoGuard API] Socket.IO Gateway: Ready on port ${config.port}`);
  });
}

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  console.log(`[GlucoGuard API] ${signal} signal received: closing connections`);
  server.close(async () => {
    console.log('[GlucoGuard API] HTTP server closed');
    try {
      await disconnectDB();
    } catch (err) {
      console.error('[GlucoGuard API] Error disconnecting DB:', err.message);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
