/**
 * GlucoGuard MongoDB Atlas Database Connection (Module M2)
 *
 * Configures Mongoose connection to MongoDB Atlas with reliable DNS resolution,
 * event lifecycle hooks, and graceful error handling.
 *
 * @module config/db
 */

const dns = require('node:dns');
const mongoose = require('mongoose');
const config = require('./index');

// Configure reliable DNS servers to prevent Windows SRV query timeouts
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  console.warn('[MongoDB] Unable to set custom DNS servers, using system defaults:', err.message);
}

/**
 * Connects to MongoDB Atlas using Mongoose.
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  const uri = config.mongodbUri;

  if (!uri) {
    throw new Error('[MongoDB] MONGODB_URI is not defined in configuration or .env');
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
  };

  try {
    const conn = await mongoose.connect(uri, options);

    console.log(`[MongoDB] Connected successfully to Atlas cluster: ${conn.connection.host}`);
    console.log(`[MongoDB] Active Database: ${conn.connection.name}`);

    // Register connection lifecycle listeners
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Runtime error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Database connection lost');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Database reconnected');
    });

    return conn;
  } catch (error) {
    console.error('[MongoDB] Connection failure:', error.message);
    throw error;
  }
}

/**
 * Gracefully disconnects from MongoDB.
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[MongoDB] Connection closed successfully');
  }
}

module.exports = {
  connectDB,
  disconnectDB
};

