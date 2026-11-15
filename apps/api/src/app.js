/**
 * GlucoGuard Express Application Setup (Module M2)
 *
 * Configures middleware, security disclaimers, and route dispatchers.
 *
 * @module app
 */

const express = require('express');
const cors = require('cors');
const config = require('./config');
const healthRoutes = require('./routes/health.routes');
const simulatorRoutes = require('./routes/simulator.routes');
const cgmRoutes = require('./routes/cgm.routes');

const app = express();

// Standard middleware
app.use(cors({
  origin: [config.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simulation header middleware per ADR-007
app.use((req, res, next) => {
  res.setHeader('X-Simulation-Mode', 'true');
  res.setHeader('X-System-Name', 'GlucoGuard-Simulation');
  res.setHeader('X-GlucoGuard-Disclaimer', 'Simulation-Only');
  next();
});

// Mount routes
app.use('/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/simulator', simulatorRoutes);
app.use('/api/v1/cgm', cgmRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'GlucoGuard API — Simulation Prototype Operational',
    version: '1.0.0',
    simulationMode: true,
    docs: '/api/v1/docs',
    health: '/health',
    simulator: '/api/v1/simulator/status',
    cgm: '/api/v1/cgm/history'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    source: 'simulation'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    source: 'simulation'
  });
});

module.exports = app;
