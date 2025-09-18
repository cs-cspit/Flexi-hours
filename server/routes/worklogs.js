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
    const { userId, email, startTime, endTime, duration, date } = req.body;
    // Normalize incoming date: if provided use it, else derive from startTime or now.
    const baseDate = date
      ? new Date(date)
      : startTime
        ? new Date(startTime)
        : new Date();
    // ISO (yyyy-mm-dd) for stable storage & filtering
    const isoDate = baseDate.toISOString().slice(0, 10);
    // dd/mm/yyyy for display convenience (still stored in existing `date` field for backward compatibility)
    const displayDate = `${String(baseDate.getDate()).padStart(2,'0')}/${String(baseDate.getMonth()+1).padStart(2,'0')}/${baseDate.getFullYear()}`;

    // Keep original schema property `date` but store display format; also attach isoDate in an extensible way if schema has flexible fields.
    const log = new WorkLog({ userId, email, startTime, endTime, duration, date: displayDate, isoDate });
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
    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);
    const displayToday = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

    // Support both legacy `date` field (mixed locale) and new `isoDate` / display format
    const logs = await WorkLog.find({
      $or: [
        { isoDate: isoToday }, // new style
        { date: displayToday }, // new display format
        { date: today.toLocaleDateString() } // legacy fallback
      ],
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
