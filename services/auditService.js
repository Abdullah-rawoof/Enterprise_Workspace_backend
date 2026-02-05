const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { v4: uuidv4 } = require('uuid');

const logsFile = path.join(__dirname, '../data/logs.json');

const getLogs = () => JSON.parse(fs.readFileSync(logsFile));

exports.logAction = (userEmail, action, details) => {
    const logs = getLogs();

    // Get last hash
    const lastLog = logs.length > 0 ? logs[0] : null;
    const previousHash = lastLog ? lastLog.hash : 'GENESIS_HASH';

    const timestamp = new Date().toISOString();

    // Create new log payload
    const payload = `${previousHash}|${userEmail}|${action}|${JSON.stringify(details)}|${timestamp}`;
    const hash = createHash('sha256').update(payload).digest('hex');

    const newLog = {
        id: uuidv4(),
        timestamp,
        user: userEmail,
        action,
        details,
        previousHash,
        hash // This seals the chain
    };

    logs.unshift(newLog); // Newest first
    fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));

    return newLog;
};

exports.verifyIntegrity = () => {
    // TODO: method to re-compute hashes and verify chain
    return true;
};
