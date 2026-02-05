const express = require('express');
const router = express.Router();
const { logAction } = require('../utils/logger');
const Task = require('../models/Task');

// 1. Assign Task (Admin)
router.post('/assign', async (req, res) => {
    try {
        const { title, description, staffId, dueDate, adminEmail } = req.body;

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

// 2. Get Staff Tasks
router.get('/staff/:id', async (req, res) => {
    try {
        const { id } = req.params; // Staff User ID or StaffID
        // In Mongodb we often store _id, but frontend sends maybe staffId or _id.
        // Let's assume frontend sends _id for now unless we search both.
        const tasks = await Task.find({ staffId: id });

        // Map _id to id for frontend safety
        res.json(tasks.map(t => ({ ...t.toObject(), id: t._id })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2.5 Get All Tasks (Admin)
router.get('/all', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ assignedAt: -1 });
        res.json(tasks.map(t => ({ ...t.toObject(), id: t._id })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Submit Report (Staff)
router.post('/:taskId/report', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { report, userEmail } = req.body;

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
