const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    author: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: Object } // Flexible field if we want to store more
});

module.exports = mongoose.model('Announcement', announcementSchema);
