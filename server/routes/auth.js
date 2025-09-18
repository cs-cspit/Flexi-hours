
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Session = require("../models/Session");
const WorkLog = require("../models/WorkLog");

// Remove employee by ID (admin only)
router.delete("/employees/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json({ message: "Employee removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Signup Route
router.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ firstName, lastName, email, password, role });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ message: "Role mismatch" });
    }
    const todayStr = new Date().toLocaleDateString();

    // Get today's worklogs for this user
    const todayLogs = await WorkLog.find({ 
      userId: user._id,
      date: todayStr 
    }).sort({ startTime: 1 });

    // Create/update session without enforcing single login
    await Session.findOneAndUpdate(
      { userId: user._id, date: todayStr },
      { $setOnInsert: { loginAt: new Date() } },
      { upsert: true, new: true }
    );

    // Calculate total duration and earnings if logs exist
    let totalDuration = 0;
    if (todayLogs.length > 0) {
      totalDuration = todayLogs.reduce((sum, log) => sum + (Number(log.duration) || 0), 0);
    }

    res.status(200).json({ 
      message: "Login successful", 
      userId: user._id, 
      username: user.username, 
      role: user.role, 
      email: user.email,
      todayLogs: todayLogs,
      totalLoggedSeconds: totalDuration
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Logout Route - closes today's session and writes a WorkLog
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const todayStr = new Date().toLocaleDateString();
    const session = await Session.findOne({ userId, date: todayStr });
    if (!session) return res.status(200).json({ message: 'No active session found for today' });
    if (session.logoutAt) return res.status(200).json({ message: 'Session already closed' });
    const logoutAt = new Date();
    const duration = Math.max(0, Math.floor((logoutAt - session.loginAt) / 1000));
    session.logoutAt = logoutAt;
    session.duration = duration;
    await session.save();
    // also persist as a WorkLog for consistency
    const user = await User.findById(userId);
    await WorkLog.create({
      userId,
      email: user?.email || 'unknown',
      startTime: session.loginAt,
      endTime: logoutAt,
      duration,
      date: todayStr,
    });
    res.json({ message: 'Logged out and session recorded', duration });
  } catch (err) {
    res.status(500).json({ message: 'Failed to logout', error: err.message });
  }
});



// Get all users
router.get("/employees", async (req, res) => {
  try {
    const employees = await User.find({}, "_id firstName lastName email role salary");
    res.status(200).json({ employees });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update salary for a user by ID
router.patch("/employees/:id/salary", async (req, res) => {
  const { salary } = req.body;
  if (typeof salary !== 'number' || salary < 0) {
    return res.status(400).json({ message: "Invalid salary value" });
  }
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { salary }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "Salary updated", salary: user.salary });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
