const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const usersFile = path.join(__dirname, 'data/users.json');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const seedAdmin = async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const adminUser = {
        id: 'admin-001',
        name: 'System Admin',
        email: 'admin@org.com',
        password: hashedPassword,
        role: 'admin'
    };

    fs.writeFileSync(usersFile, JSON.stringify([adminUser], null, 2));
    console.log('Admin user seeded.');
};

seedAdmin();
