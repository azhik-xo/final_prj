const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const GlucoseReading = require('../models/glucoseReading.model');
const aiService = require('../services/ai.service');

// In-memory buffer for offline/test mode when MongoDB connection is not active
const inMemoryReadings = [];

/**
 * @route GET /api/v1/cgm/history
 * @desc Get historical glucose readings for a device/patient
 * @query deviceId?: string, userId?: string, limit?: number
 */
router.get('/history', async (req, res) => {
  try {
    const { deviceId, userId, limit = 50 } = req.query;
    const parsedLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));

    let chronological = [];

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (deviceId) query.deviceId = deviceId;
      if (userId) query.userId = userId;

      const readings = await GlucoseReading.find(query)
        .sort({ timestamp: -1 })
        .limit(parsedLimit)
        .lean();

      chronological = readings.reverse();
    } else {
      // In-memory fallback
      let filtered = [...inMemoryReadings];
      if (deviceId) filtered = filtered.filter(r => r.deviceId === deviceId);
      if (userId) filtered = filtered.filter(r => r.userId === userId);
      chronological = filtered.slice(-parsedLimit);
    }

    res.status(200).json({
      success: true,
      status: 'ok',
      count: chronological.length,
      data: chronological,
      source: 'simulation'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/cgm/prediction
 * @desc Fetch short-term AI forecast (+15, +30, +45m) and early breach warning
 * @query deviceId?: string, userId?: string, personaId?: string
 */
router.get('/prediction', async (req, res) => {
  try {
    const { deviceId, userId, personaId } = req.query;

    let readings = [];
    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (deviceId) query.deviceId = deviceId;
      if (userId) query.userId = userId;

      const results = await GlucoseReading.find(query)
        .sort({ timestamp: -1 })
        .limit(12)
        .lean();
      readings = results.reverse();
    } else {
      let filtered = [...inMemoryReadings];
      if (deviceId) filtered = filtered.filter(r => r.deviceId === deviceId);
      if (userId) filtered = filtered.filter(r => r.userId === userId);
      readings = filtered.slice(-12);
    }

    const prediction = await aiService.getPrediction(readings, [15, 30, 45], personaId || 'VP-01');

    res.status(200).json({
      success: true,
      status: 'ok',
      data: prediction,
      source: 'simulation'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/cgm/readings
 * @desc Direct ingestion endpoint for telemetry readings
 */
router.post('/readings', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || payload.glucose === undefined || !payload.deviceId) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Invalid reading payload: "glucose" and "deviceId" are required'
      });
    }

    // Enforce mandatory simulation source tag
    const readingData = {
      ...payload,
      source: 'simulation',
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date()
    };

    let saved;
    if (mongoose.connection.readyState === 1) {
      saved = await GlucoseReading.create(readingData);
    } else {
      // Offline / Test mock document
      const doc = new GlucoseReading(readingData);
      const validationError = doc.validateSync();
      if (validationError) {
        return res.status(400).json({
          success: false,
          status: 'error',
          message: validationError.message
        });
      }
      saved = {
        _id: 'mem_' + Date.now(),
        ...readingData
      };
      inMemoryReadings.push(saved);
      if (inMemoryReadings.length > 500) {
        inMemoryReadings.shift();
      }
    }

    res.status(201).json({
      success: true,
      status: 'ok',
      message: 'Reading ingested successfully',
      data: saved,
      source: 'simulation'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
