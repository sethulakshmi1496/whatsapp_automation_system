// Migration script to add adminId to existing customers
// Run this ONCE after deploying the multi-tenant changes

const { Customer, User } = require('./src/models');
const sequelize = require('./src/config/db');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        // Get the first admin user (or you can specify a particular admin)
        const firstAdmin = await User.findOne({ where: { role: 'admin' } });

        if (!firstAdmin) {
            console.error('No admin user found! Please create an admin user first.');
            process.exit(1);
        }

        console.log(`Found admin: ${firstAdmin.email} (ID: ${firstAdmin.id})`);

        // Find customers without adminId
        const customersWithoutAdmin = await Customer.findAll({
            where: {
                adminId: null
            }
        });

        console.log(`Found ${customersWithoutAdmin.length} customers without adminId`);

        if (customersWithoutAdmin.length > 0) {
            // Assign all existing customers to the first admin
            await Customer.update(
                { adminId: firstAdmin.id },
                { where: { adminId: null } }
            );
            console.log(`Assigned ${customersWithoutAdmin.length} customers to admin ${firstAdmin.email}`);
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrate();
