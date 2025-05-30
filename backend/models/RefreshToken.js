const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  ip: { type: String },
  userAgent: { type: String }
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);