// Script to reset all user passwords to a known value
const { User } = require('./src/models');
const sequelize = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        const users = await User.findAll();
        console.log(`Found ${users.length} users`);

        for (const user of users) {
            // Set password to 'admin123' for all users
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await user.update({ password_hash: hashedPassword });
            console.log(`Reset password for: ${user.email}`);
        }

        console.log('\nAll passwords reset to: admin123');
        console.log('\nYou can now login with:');
        users.forEach(u => {
            console.log(`  Email: ${u.email}`);
            console.log(`  Password: admin123`);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetPasswords();
