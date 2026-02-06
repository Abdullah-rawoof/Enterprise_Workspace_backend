require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploads - IMPORTANT: Serve at '/uploads' path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug Middleware: Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Ensure required directories exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Routes (Imports)
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const taskRoutes = require('./routes/tasks');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tasks', taskRoutes);

const verifyToken = require('./middleware/auth');
const User = require('./models/User');
const Log = require('./models/Log');

app.get('/api/logs', verifyToken, async (req, res) => {
    try {
        // SECURITY FIX: Only fetch logs for THIS Admin and their Staff
        const adminEmail = req.user.email;

        // Find staff belonging to this admin
        const staffUsers = await User.find({ adminId: req.user.id });
        const staffEmails = staffUsers.map(u => u.email);

        // Allow logs from Admin OR Staff
        const allowedEmails = [adminEmail, ...staffEmails];

        const logs = await Log.find({ user: { $in: allowedEmails } }).sort({ timestamp: -1 }).limit(100);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Organization LLM Backend Running');
});

// Start Server (If running locally)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
