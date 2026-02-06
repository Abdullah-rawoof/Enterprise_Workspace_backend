const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    path: { type: String, required: true },
    type: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String }, // User ID or Email
    description: { type: String } // User provided description
});

module.exports = mongoose.model('Document', documentSchema);
