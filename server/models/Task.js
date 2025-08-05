const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  description: { type: String, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // senior
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // employee
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Task", taskSchema);
