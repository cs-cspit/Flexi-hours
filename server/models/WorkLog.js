const mongoose = require('mongoose');

const WorkLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in seconds
  date: { type: String, required: true }
});

module.exports = mongoose.model('WorkLog', WorkLogSchema);
