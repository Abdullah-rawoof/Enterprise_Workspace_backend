const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    governance: { type: Object }, // Store governance data for assistant messages
    sources: { type: Array }, // Store sources for assistant messages
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
