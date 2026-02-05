const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    user: { type: String, required: true }, // Email or ID
    role: { type: String, default: 'system' },
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed }, // Flexible payload
    timestamp: { type: Date, default: Date.now },
    hash: { type: String }, // For integrity
    previousHash: { type: String }
});

module.exports = mongoose.model('Log', logSchema);
