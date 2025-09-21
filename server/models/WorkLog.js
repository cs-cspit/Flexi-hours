const mongoose = require('mongoose');

const WorkLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in seconds
  date: { type: String }, // Optional for backward compatibility - no longer used
  isoDate: { type: String }, // Optional for backward compatibility - no longer used
  idleSegments: [{
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    duration: { type: Number, required: true } // in seconds
  }],
  totalIdleTime: { type: Number, default: 0 }, // sum of all idle durations in seconds
  effectiveDuration: { type: Number } // duration minus idle time
});

module.exports = mongoose.model('WorkLog', WorkLogSchema);
