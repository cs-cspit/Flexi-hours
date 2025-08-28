const express = require('express');
const router = express.Router();
const WorkLog = require('../models/WorkLog');

// Add a work log (creates collection if not exists)
router.post('/', async (req, res) => {
  try {
    const { userId, email, startTime, endTime, duration, date } = req.body;
    const log = new WorkLog({ userId, email, startTime, endTime, duration, date });
    await log.save();
    res.status(201).json({ message: 'Work log saved' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save work log', error: err.message });
  }
});

module.exports = router;
