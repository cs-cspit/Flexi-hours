const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // same format as WorkLog (toLocaleDateString)
  loginAt: { type: Date, required: true },
  logoutAt: { type: Date },
  duration: { type: Number }, // seconds
});

SessionSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Session', SessionSchema);
