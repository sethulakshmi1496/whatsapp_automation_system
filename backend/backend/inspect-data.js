const { User, Customer } = require('./src/models');
const sequelize = require('./src/config/db');

async function inspectData() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        const users = await User.findAll({ attributes: ['id', 'email'] });
        console.log('\n--- USERS ---');
        users.forEach(u => console.log(`ID: ${u.id} | Email: ${u.email}`));

        const customers = await Customer.findAll();
        console.log('\n--- CUSTOMERS ---');
        customers.forEach(c => console.log(`ID: ${c.id} | Name: ${c.name} | Phone: ${c.phone} | AdminID: ${c.adminId}`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

inspectData();
