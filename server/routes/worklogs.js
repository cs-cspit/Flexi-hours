const express = require('express');
const router = express.Router();
const WorkLog = require('../models/WorkLog');

// Get all worklogs (for senior view)
router.get('/', async (req, res) => {
  try {
    const logs = await WorkLog.find().sort({ date: -1, startTime: -1 });
    res.json({ logs });
  } catch (err) {
    console.error('Error fetching all worklogs:', err);
    res.status(500).json({ message: 'Failed to fetch worklogs', error: err.message });
  }
});

// Add a work log (creates collection if not exists)
router.post('/', async (req, res) => {
  try {
    const { userId, email, startTime, endTime, duration, idleSegments = [] } = req.body;

    // Calculate idle metrics
    const totalIdleTime = idleSegments.reduce((sum, segment) => {
      return sum + (segment.duration || 0);
    }, 0);
    const effectiveDuration = duration - totalIdleTime;

    // Create worklog with just the essential data - use startTime for all date operations
    const log = new WorkLog({ 
      userId, 
      email, 
      startTime, 
      endTime, 
      duration, 
      idleSegments,
      totalIdleTime,
      effectiveDuration
    });
    await log.save();
    res.status(201).json({ message: 'Work log saved', log });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save work log', error: err.message });
  }
});

// Delete a worklog by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await WorkLog.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Worklog not found' });
    }
    res.json({ message: 'Worklog deleted successfully', deleted });
  } catch (err) {
    console.error('Error deleting worklog:', err);
    res.status(500).json({ message: 'Failed to delete worklog', error: err.message });
  }
});

// Get today's logs for a user
router.get('/:userId/today', async (req, res) => {
  try {
    const { userId } = req.params;
    const { email } = req.query; // Get email from query params
    // Get today's date range using startTime
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Filter by startTime range instead of problematic date fields
    const logs = await WorkLog.find({
      startTime: {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      },
      $or: [
        { userId, email },
        { email }
      ]
    }).sort({ startTime: -1 });

    res.json({ logs });
  } catch (err) {
    console.error('Error in worklog fetch:', err);
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message });
  }
});

module.exports = router;
