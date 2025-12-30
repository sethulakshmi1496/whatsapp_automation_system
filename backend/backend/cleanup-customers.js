// Script to delete unwanted test customers
const { Customer } = require('./src/models');
const sequelize = require('./src/config/db');

async function deleteTestCustomers() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        // Phone numbers to delete
        const phoneNumbersToDelete = [
            '219155101917437',
            '179495340396602',
            '911234567890',
            '912345678901',
            '919876543210',
            '918848356679'  // Admin number
        ];

        console.log('Deleting test customers...');

        const deleted = await Customer.destroy({
            where: {
                phone: phoneNumbersToDelete
            }
        });

        console.log(`Deleted ${deleted} test customers`);

        // Show remaining customers
        const remaining = await Customer.findAll();
        console.log('\nRemaining customers:');
        remaining.forEach(c => {
            console.log(`  ${c.name} — ${c.phone} (tags: ${JSON.stringify(c.tags)})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deleteTestCustomers();
