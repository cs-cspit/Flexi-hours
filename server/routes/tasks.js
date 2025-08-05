const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User");

// Create a new task
router.post("/", async (req, res) => {
  const { description, assignedBy, assignedTo } = req.body;
  if (!description || !assignedBy || !assignedTo) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const task = new Task({ description, assignedBy, assignedTo });
    await task.save();
    res.status(201).json({ message: "Task created", task });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// Get all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("assignedBy", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email");
    res.status(200).json({ tasks });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
