const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    staffId: { type: String, unique: true, sparse: true }, // Auto-generated for staff
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to Admin
    orgDetails: {
        name: String,
        location: String,
        about: String,
        photo: String
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
