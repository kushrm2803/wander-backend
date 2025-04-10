//models/TempUSer
//created for OTP verification

const mongoose = require("mongoose");

const tempUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String, // plain (will be hashed on final user creation)
  otp: String, // hashed
  otpExpiresAt: Date,
  otpAttempts: { type: Number, default: 0 },
});

module.exports = mongoose.model("TempUser", tempUserSchema);