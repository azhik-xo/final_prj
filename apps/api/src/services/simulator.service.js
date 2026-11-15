/**
 * GlucoGuard Simulator Bridge Service (Module M2)
 *
 * Bridges the in-memory Virtual CGM Simulator Engine with:
 * 1. MongoDB Atlas persistence via GlucoseReading Mongoose model
 * 2. Real-time WebSocket broadcasting via Socket.IO Gateway
 *
 * @module services/simulator.service
 */

const mongoose = require('mongoose');
const { SimulatorEngine } = require('../simulator/simulatorEngine');
const { getAllPersonas, getPersona, DEFAULT_PERSONA_ID } = require('../simulator/personas');
const GlucoseReading = require('../models/glucoseReading.model');
const { broadcastReading, broadcastStatus, broadcastEvent } = require('../sockets/cgmSocket');

class SimulatorService {
  constructor() {
    this.engine = new SimulatorEngine();

    // Wire readings to real-time WebSockets & MongoDB persistence
    this.engine.on('reading', async (reading) => {
      // 1. Broadcast over WebSockets immediately
      try {
        broadcastReading(reading);
      } catch (err) {
        console.error('[Simulator Service] WebSocket broadcast error:', err.message);
      }

      // 2. Persist to MongoDB if connected
      try {
        if (mongoose.connection.readyState === 1) {
          await GlucoseReading.create(reading);
        }
      } catch (err) {
        console.error('[Simulator Service] Database persistence error:', err.message);
      }
    });

    // Wire status changes
    this.engine.on('statusChange', (status) => {
      try {
        broadcastStatus(status);
      } catch (err) {
        console.error('[Simulator Service] Status broadcast error:', err.message);
      }
    });

    // Wire event injections
    this.engine.on('eventInjected', (eventData) => {
      try {
        broadcastEvent(eventData);
      } catch (err) {
        console.error('[Simulator Service] Event broadcast error:', err.message);
      }
    });
  }

  getEngine() {
    return this.engine;
  }

  getPersonas() {
    return getAllPersonas();
  }

  getPersonaById(personaId) {
    return getPersona(personaId);
  }

  getStatus() {
    return this.engine.getStatus();
  }

  getLatestReading() {
    return this.engine.getLatestReading();
  }

  start(personaId = DEFAULT_PERSONA_ID, options = {}) {
    const firstReading = this.engine.start(personaId, options);
    return {
      status: this.getStatus(),
      firstReading
    };
  }

  startSimulator(personaId = DEFAULT_PERSONA_ID, intervalMs = 2000, extraOptions = {}) {
    return this.start(personaId, { intervalMs, ...extraOptions });
  }

  pause() {
    this.engine.pause();
    return this.engine.getStatus();
  }

  pauseSimulator() {
    return this.pause();
  }

  resume() {
    this.engine.resume();
    return this.engine.getStatus();
  }

  resumeSimulator() {
    return this.resume();
  }

  stop() {
    this.engine.stop();
    return this.engine.getStatus();
  }

  stopSimulator() {
    return this.stop();
  }

  injectEvent(eventType, params = {}) {
    return this.engine.injectEvent(eventType, params);
  }

  setSpeed(intervalMs) {
    this.engine.setSpeed(intervalMs);
    return this.engine.getStatus();
  }
}

// Export singleton instance
const simulatorService = new SimulatorService();

module.exports = simulatorService;
