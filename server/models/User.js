const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['employee', 'senior_employee', 'admin'], default: 'employee' }
});

module.exports = mongoose.model("User", userSchema);
