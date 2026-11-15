/**
 * GlucoGuard Simulator Control Routes (Module M2 + M3)
 *
 * RESTful interface for controlling the Virtual CGM Simulator from web UI:
 * - GET /api/v1/simulator/status
 * - GET /api/v1/simulator/personas
 * - POST /api/v1/simulator/start
 * - POST /api/v1/simulator/pause
 * - POST /api/v1/simulator/resume
 * - POST /api/v1/simulator/stop
 * - POST /api/v1/simulator/inject
 * - POST /api/v1/simulator/speed
 *
 * @module routes/simulator.routes
 */

const express = require('express');
const router = express.Router();
const simulatorService = require('../services/simulator.service');

// GET /api/v1/simulator/status
router.get('/status', (req, res) => {
  const status = simulatorService.getStatus();
  res.status(200).json({
    status: 'ok',
    success: true,
    data: status,
    source: 'simulation'
  });
});

// GET /api/v1/simulator/personas
router.get('/personas', (req, res) => {
  const personas = simulatorService.getPersonas();
  res.status(200).json({
    status: 'ok',
    success: true,
    data: personas,
    source: 'simulation'
  });
});

// POST /api/v1/simulator/start
router.post('/start', (req, res) => {
  try {
    const { personaId = 'VP-03', intervalMs = 2000, initialGlucose, simulatedMinutesPerTick } = req.body;
    const result = simulatorService.startSimulator(personaId, intervalMs, {
      initialGlucose,
      simulatedMinutesPerTick
    });

    res.status(200).json({
      status: 'ok',
      success: true,
      message: `Simulator started for persona ${personaId}`,
      data: result,
      source: 'simulation'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      success: false,
      error: error.message,
      source: 'simulation'
    });
  }
});

// POST /api/v1/simulator/pause
router.post('/pause', (req, res) => {
  const status = simulatorService.pauseSimulator();
  res.status(200).json({
    status: 'ok',
    success: true,
    message: 'Simulator paused',
    data: status,
    source: 'simulation'
  });
});

// POST /api/v1/simulator/resume
router.post('/resume', (req, res) => {
  const status = simulatorService.resumeSimulator();
  res.status(200).json({
    status: 'ok',
    success: true,
    message: 'Simulator resumed',
    data: status,
    source: 'simulation'
  });
});

// POST /api/v1/simulator/stop
router.post('/stop', (req, res) => {
  const status = simulatorService.stopSimulator();
  res.status(200).json({
    status: 'ok',
    success: true,
    message: 'Simulator stopped',
    data: status,
    source: 'simulation'
  });
});

// POST /api/v1/simulator/inject
router.post('/inject', (req, res) => {
  try {
    const { eventType, params = {} } = req.body;

    if (!eventType) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'eventType is required (e.g. meal_spike, hypo_drop, exercise, rescue_carbs, reset)',
        source: 'simulation'
      });
    }

    const injected = simulatorService.injectEvent(eventType, params);
    res.status(200).json({
      status: 'ok',
      success: true,
      message: `Injected event: ${eventType}`,
      data: {
        injected
      },
      source: 'simulation'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      success: false,
      error: error.message,
      source: 'simulation'
    });
  }
});

// POST /api/v1/simulator/speed
router.post('/speed', (req, res) => {
  try {
    const { intervalMs } = req.body;
    if (!intervalMs || isNaN(intervalMs)) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'intervalMs must be a positive number',
        source: 'simulation'
      });
    }

    const status = simulatorService.setSpeed(Number(intervalMs));
    res.status(200).json({
      status: 'ok',
      success: true,
      message: `Simulator speed updated to ${intervalMs} ms`,
      data: status,
      source: 'simulation'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      success: false,
      error: error.message,
      source: 'simulation'
    });
  }
});

module.exports = router;
