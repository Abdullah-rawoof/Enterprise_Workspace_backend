const express = require('express');
const router = express.Router();
const { logAction } = require('../utils/logger');
const authService = require('../services/authService');

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);

        logAction('LOGIN_SUCCESS', 'User logged in', { email: result.user.email, role: result.user.role });

        res.json(result);
    } catch (error) {
        // Optional: Log failed login attempts?
        // logAction('LOGIN_FAIL', error.message, { email });
        res.status(401).json({ error: error.message });
    }
});

router.post('/signup', async (req, res) => {
    try {
        const { email, password, orgName } = req.body;

        // Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const result = await authService.signup(email, password, orgName);

        logAction('SIGNUP_SUCCESS', `New organization: ${orgName}`, { email: result.user.email, role: 'admin' });

        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
