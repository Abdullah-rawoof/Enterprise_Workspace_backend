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
        const result = await authService.signup(email, password, orgName);

        logAction('SIGNUP_SUCCESS', `New organization: ${orgName}`, { email: result.user.email, role: 'admin' });

        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
