const express = require('express');
const router = express.Router();

/**
 * @route GET /health
 * @route GET /api/v1/health
 * @desc System health check endpoint
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api',
    source: 'simulation',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

