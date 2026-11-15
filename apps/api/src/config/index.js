const path = require('node:path');
const dotenv = require('dotenv');

// Load environment from apps/api/.env or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/glucoguard',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  aiEngineUrl: process.env.AI_ENGINE_URL || 'http://localhost:8000',
  simulationMode: process.env.SIMULATION_MODE === 'true' || true
};

module.exports = config;
