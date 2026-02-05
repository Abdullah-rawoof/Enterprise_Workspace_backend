const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 1000;

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Login
// Login
exports.login = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    // Initialize user object
    let userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        staffId: user.staffId,
        orgDetails: user.orgDetails || {}
    };

    // If Staff, fetch Org Details from their Admin
    if (user.role === 'staff' && user.adminId) {
        const admin = await User.findById(user.adminId);
        if (admin && admin.orgDetails) {
            // Merge Admin's Org Details
            userData.orgDetails = admin.orgDetails;
        }
    }

    const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    return { token, user: userData };
};

// Signup (Admin only usually, or initial setup)
exports.signup = async (email, password, orgName) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
        name: orgName || 'Admin',
        email,
        password: hashedPassword,
        role: 'admin',
        orgDetails: { name: orgName }
    });

    const token = jwt.sign(
        { id: newUser._id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    return {
        token,
        user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        }
    };
};
