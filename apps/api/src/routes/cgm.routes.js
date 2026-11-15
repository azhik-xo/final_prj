/**
 * GlucoGuard CGM Telemetry Ingestion & History Routes (Module M2)
 *
 * Provides RESTful access to historical glucose readings and external CGM ingestion:
 * - GET /api/v1/cgm/history?deviceId=...&limit=50
 * - GET /api/v1/cgm/latest?deviceId=...
 * - POST /api/v1/cgm/readings (Ingestion endpoint per ADR-002)
 *
 * @module routes/cgm.routes
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const GlucoseReading = require('../models/glucoseReading.model');
const { broadcastReading } = require('../sockets/cgmSocket');
const simulatorService = require('../services/simulator.service');

// GET /api/v1/cgm/history
router.get('/history', async (req, res) => {
  try {
    const { deviceId, userId, limit = 50 } = req.query;
    const query = {};
    if (deviceId) query.deviceId = deviceId;
    if (userId) query.userId = userId;

    const parsedLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));

    let chronological = [];
    if (mongoose.connection.readyState === 1) {
      const readings = await GlucoseReading.find(query)
        .sort({ timestamp: -1 })
        .limit(parsedLimit)
        .lean();
      chronological = readings.reverse();
    } else {
      // If DB is offline, provide latest in-memory reading if available
      const latest = simulatorService.getLatestReading();
      if (latest) {
        chronological = [latest];
      }
    }

    res.status(200).json({
      status: 'ok',
      count: chronological.length,
      data: chronological,
      source: 'simulation'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      source: 'simulation'
    });
  }
});

// GET /api/v1/cgm/latest
router.get('/latest', async (req, res) => {
  try {
    const { deviceId } = req.query;
    let latest = null;

    if (mongoose.connection.readyState === 1) {
      const query = deviceId ? { deviceId } : {};
      latest = await GlucoseReading.findOne(query).sort({ timestamp: -1 }).lean();
    }

    if (!latest) {
      latest = simulatorService.getLatestReading();
    }

    if (!latest) {
      return res.status(404).json({
        status: 'error',
        message: 'No readings found',
        source: 'simulation'
      });
    }

    res.status(200).json({
      status: 'ok',
      data: latest,
      source: 'simulation'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      source: 'simulation'
    });
  }
});

// POST /api/v1/cgm/readings (Direct Ingestion Endpoint)
router.post('/readings', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.glucose || !payload.deviceId) {
      return res.status(400).json({
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
      saved = saved.toJSON();
    } else {
      const doc = new GlucoseReading(readingData);
      const validationError = doc.validateSync();
      if (validationError) throw validationError;
      saved = doc.toJSON();
    }

    // Broadcast in real-time over Socket.IO
    broadcastReading(saved);

    res.status(201).json({
      status: 'ok',
      message: 'Reading ingested successfully',
      data: saved,
      source: 'simulation'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
      source: 'simulation'
    });
  }
});

module.exports = router;
