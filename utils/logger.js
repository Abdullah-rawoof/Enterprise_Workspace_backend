const Log = require('../models/Log');
const { createHash } = require('crypto');

const logAction = async (action, details, user) => {
    try {
        // Get last log for simple hash chain (optional for now, can be optimized)
        const lastLog = await Log.findOne().sort({ timestamp: -1 });
        const previousHash = lastLog ? lastLog.hash : 'GENESIS_HASH';

        const timestamp = new Date().toISOString();
        const payload = `${previousHash}|${user.email}|${action}|${JSON.stringify(details)}|${timestamp}`;
        const hash = createHash('sha256').update(payload).digest('hex');

        await Log.create({
            user: user.email || user.username || 'System',
            role: user.role || 'unknown',
            action,
            details,
            timestamp,
            hash,
            previousHash
        });

        console.log(`[LOG] ${action}: ${user.email}`);
    } catch (error) {
        console.error("Failed to write log:", error);
    }
};

module.exports = { logAction };
