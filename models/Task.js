const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    staffId: { type: String, required: true }, // Reference to User.staffId or User._id
    assignedBy: { type: String, required: true }, // Admin Email
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    report: { type: String },
    assignedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    dueDate: { type: Date }
});

module.exports = mongoose.model('Task', taskSchema);
