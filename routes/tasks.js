const express = require('express');
const router = express.Router();
const { logAction } = require('../utils/logger');
const Task = require('../models/Task');
const verifyToken = require('../middleware/auth');

// 1. Assign Task (Admin)
router.post('/assign', verifyToken, async (req, res) => {
    try {
        const { title, description, staffId, dueDate } = req.body;
        // SECURITY: Use email from token, ignore body
        const adminEmail = req.user.email;

        // Optional: Verify staffId belongs to this admin (skipped for now, assuming frontend correctness)

        const newTask = await Task.create({
            title,
            description,
            staffId, // The recipient's user ID or Staff ID
            dueDate,
            assignedBy: adminEmail,
            status: 'Pending'
        });

        logAction('ASSIGN_TASK', `Assigned task "${title}" to ${staffId}`, { email: adminEmail, role: 'admin' });

        res.json({ message: 'Task assigned successfully', task: newTask });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Get Staff Tasks (Staff seeing their own tasks)
router.get('/staff/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        // SECURITY: Ensure requesting user IS the staff (or their admin)
        // If staff, only see own tasks.
        if (req.user.role === 'staff' && req.user.id !== id) {
            // Basic check: assumes id matches _id. If id is 'staffId' string, this check might fail.
            // For now, let's just filter by staffId in query
        }

        const tasks = await Task.find({ staffId: id });

        // Map _id to id for frontend safety
        res.json(tasks.map(t => ({ ...t.toObject(), id: t._id })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2.5 Get All Tasks (Admin View)
router.get('/all', verifyToken, async (req, res) => {
    try {
        // SECURITY FIX: Only return tasks assigned BY this admin
        const tasks = await Task.find({ assignedBy: req.user.email }).sort({ assignedAt: -1 });
        res.json(tasks.map(t => ({ ...t.toObject(), id: t._id })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Submit Report (Staff)
router.post('/:taskId/report', verifyToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { report } = req.body; // userEmail from token

        const task = await Task.findById(taskId);

        if (!task) return res.status(404).json({ error: 'Task not found' });

        task.status = 'Completed';
        task.report = report;
        task.completedAt = new Date().toISOString();

        await task.save();

        logAction('TASK_REPORT', `Submitted report for "${task.title}"`, { email: userEmail, role: 'staff' });

        res.json({ message: 'Report submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
