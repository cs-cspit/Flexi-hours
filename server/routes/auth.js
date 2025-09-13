
const express = require("express");
const router = express.Router();
const User = require("../models/User");

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
    res.status(200).json({
      message: "Login successful",
      userId: user._id,
      username: user.username,
      role: user.role,
      email: user.email
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
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
