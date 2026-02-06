const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Still needed for file deletion
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { logAction } = require('../utils/logger');
const verifyToken = require('../middleware/auth'); // Import Middleware

// Models
const USER = require('../models/User');
const DOC = require('../models/Document');
const ANNOUNCE = require('../models/Announcement');
const LLM_CONFIG = require('../models/LLMConfig');

// Multer Setup
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// 5. Get Users (Staff)
router.get('/users', verifyToken, async (req, res) => {
    try {
        // SECURITY FIX: Only fetch staff that belong to THIS admin
        const users = await USER.find({ role: 'staff', adminId: req.user.id });

        // Map to format frontend expects if needed
        res.json(users.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            staffId: u.staffId
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Add Staff Implementation
router.post('/add-staff', verifyToken, async (req, res) => {
    try {
        const { name, email } = req.body;

        // Check if user exists
        const existingUser = await USER.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        // Generate Credentials
        const password = Math.random().toString(36).slice(-8); // Random 8 char password
        const hashedPassword = await bcrypt.hash(password, 10);
        const staffId = `STF-${uuidv4().substring(0, 8).toUpperCase()}`;

        const newStaff = await USER.create({
            name,
            email,
            password: hashedPassword,
            role: 'staff',
            staffId,
            adminId: req.user.id, // Link to current Admin
            orgDetails: req.user.orgDetails // Inherit Org Details (Optional)
        });

        logAction('ADD_STAFF', `Added staff: ${name}`, { email: req.user.email, role: 'admin' });

        res.json({
            message: 'Staff added successfully',
            credentials: {
                staffId,
                email,
                password // Send back to Admin to share
            },
            user: {
                id: newStaff._id,
                name: newStaff.name,
                email: newStaff.email,
                role: 'staff'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 1. Get Stats (Dashboard)
router.get('/stats', verifyToken, async (req, res) => {
    try {
        // SECURITY FIX: Count only MY staff and MY docs
        const totalStaff = await USER.countDocuments({ role: 'staff', adminId: req.user.id });
        const totalDocs = await DOC.countDocuments({ uploadedBy: req.user.email });

        res.json({
            stats: {
                totalStaff,
                totalDocuments: totalDocs,
                systemStatus: 'Operational'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Upload Document
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        logAction('UPLOAD_START', `Started upload: ${req.file.originalname}`, { email: req.user.email, role: req.user.role });

        const newDoc = await DOC.create({
            name: req.file.originalname,
            path: req.file.path,
            type: path.extname(req.file.originalname).substring(1),
            size: req.file.size,
            uploadedBy: req.user.email, // Store Admin Email as Owner
            description: req.body.description || ''
        });

        logAction('UPLOAD_SUCCESS', `Uploaded ${newDoc.name}`, { email: req.user.email, role: req.user.role });

        res.json({ message: 'File uploaded successfully', document: newDoc });
    } catch (error) {
        // ... err ...
        res.status(500).json({ error: error.message });
    }
});

// 3. Get Documents
router.get('/documents', verifyToken, async (req, res) => {
    try {
        const docs = await DOC.find({ uploadedBy: req.user.email }).sort({ uploadedAt: -1 });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Update Profile (Org Details)
router.post('/profile', verifyToken, upload.single('photo'), async (req, res) => {
    try {
        // Use email from Token for security, ignore body email
        const email = req.user.email;
        const { orgName, location, about } = req.body;

        const user = await USER.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Initialize if missing
        if (!user.orgDetails) user.orgDetails = {};

        // Update fields individually to avoid overwriting the whole object
        if (orgName) user.orgDetails.name = orgName;
        if (location) user.orgDetails.location = location;
        if (about) user.orgDetails.about = about;

        // Handle Photo Path
        if (req.file) {
            // Normalize path to forward slashes
            let photoPath = req.file.path.replace(/\\/g, '/');
            // Ensure it starts with 'uploads/' for strict serving
            if (photoPath.startsWith('uploads/')) {
                // It's already good (e.g. uploads/file.jpg)
            } else if (!photoPath.includes('/')) {
                // If simple filename, prepend
                photoPath = 'uploads/' + photoPath;
            }
            user.orgDetails.photo = photoPath;
        }

        // Mongoose requires marking Mixed/Nested types as modified if we mutate them directly
        user.markModified('orgDetails');

        await user.save();

        logAction('UPDATE_CONFIG', 'Updated Organization Profile', { email, role: 'admin' });

        res.json({
            message: 'Profile updated', user: {
                id: user._id,
                name: user.name,
                email: user.email,
                orgDetails: user.orgDetails
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 8. Announcement
router.post('/announce', verifyToken, async (req, res) => {
    try {
        const { title, message } = req.body;
        const author = req.user.email; // Security: Author is always the logged-in admin

        const newAnnounce = await ANNOUNCE.create({
            title,
            message,
            author,
            details: { title, message } // Storing in details as well to match frontend log structure expecting 'details'
        });

        logAction('ANNOUNCEMENT', `Posted: ${title}`, { email: author, role: 'admin' });
        res.json({ message: 'Announcement posted', announcement: newAnnounce });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. Get Announcements
router.get('/announcements', async (req, res) => {
    try {
        const list = await ANNOUNCE.find().sort({ timestamp: -1 }).limit(10);
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 10. Staff Feed (Announcements + Documents)
router.get('/feed', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        let adminEmail = 'admin@org.com'; // Default

        // Fetch Announcements from Admin
        console.log(`[FEED DEBUG] Fetching feed for User Role: ${user.role}, User ID: ${user.id}`);

        // If staff, find their admin
        if (user.role === 'staff') {
            const staffUser = await USER.findById(user.id);
            if (staffUser) {
                console.log(`[FEED DEBUG] Staff Found. AdminID: ${staffUser.adminId}`);
                if (staffUser.adminId) {
                    const admin = await USER.findById(staffUser.adminId);
                    if (admin) {
                        adminEmail = admin.email;
                        console.log(`[FEED DEBUG] Resolved Admin Email: ${adminEmail}`);
                    } else {
                        console.log(`[FEED DEBUG] Admin Not Found for ID: ${staffUser.adminId}`);
                    }
                } else {
                    console.log(`[FEED DEBUG] Staff has no AdminID linked.`);
                }
            } else {
                console.log(`[FEED DEBUG] Staff User Not Found in DB.`);
            }
        } else {
            adminEmail = user.email; // If admin is viewing feed
            console.log(`[FEED DEBUG] User is Admin. Using Email: ${adminEmail}`);
        }

        // Fetch Announcements from Admin
        const announcements = await ANNOUNCE.find({ author: adminEmail }).sort({ timestamp: -1 }).limit(10);
        console.log(`[FEED DEBUG] Found ${announcements.length} announcements for author ${adminEmail}`);

        // Fetch Documents strictly for this Organization
        const docs = await DOC.find({ uploadedBy: adminEmail }).sort({ uploadedAt: -1 }).limit(10);

        // Combine
        const feed = [
            ...announcements.map(a => ({
                type: 'ANNOUNCEMENT',
                action: 'ANNOUNCEMENT',
                details: a.details || { title: a.title, message: a.message },
                timestamp: a.timestamp
            })),
            ...docs.map(d => ({
                type: 'DOCUMENT',
                action: 'DOCUMENT_UPLOAD',
                details: d.name,
                timestamp: d.uploadedAt
            }))
        ];

        // Sort combined feed
        feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(feed);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// 9. LLM Config
router.post('/llm-config', verifyToken, async (req, res) => {
    try {
        const { prompt, enableSearch, enableRAG } = req.body;
        // Upsert config (always keep one singleton config for simplicity in this MVP)
        let config = await LLM_CONFIG.findOne();
        if (!config) {
            config = new LLM_CONFIG({ prompt, enableSearch, enableRAG });
        } else {
            if (prompt !== undefined) config.prompt = prompt;
            if (enableSearch !== undefined) config.enableSearch = enableSearch;
            if (enableRAG !== undefined) config.enableRAG = enableRAG;
            config.updatedAt = Date.now();
        }
        await config.save();

        logAction('UPDATE_CONFIG', 'Updated LLM System Prompt', { email: req.user.email, role: 'admin' });
        res.json({ message: 'Config updated', config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/llm-config', async (req, res) => {
    try {
        const config = await LLM_CONFIG.findOne() || new LLM_CONFIG(); // Default if none
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
