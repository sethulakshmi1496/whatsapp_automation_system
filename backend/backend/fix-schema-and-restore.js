const { sequelize } = require('./src/models');
const { QueryTypes } = require('sequelize');

async function fixAndRestore() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        // 1. Fix Indexes
        console.log('Fixing indexes...');
        try {
            // Try to drop the old unique index on phone
            // The name is usually 'phone' or 'phone_2' or 'customers_phone_unique'
            // We'll try a few common names or query for it
            const [results] = await sequelize.query(
                "SHOW INDEX FROM Customers WHERE Column_name = 'phone' AND Non_unique = 0"
            );

            for (const index of results) {
                console.log(`Dropping index: ${index.Key_name}`);
                await sequelize.query(`ALTER TABLE Customers DROP INDEX ${index.Key_name}`);
            }

            // Add new composite index
            // Sequelize sync might do this, but let's ensure it
            try {
                await sequelize.query('CREATE UNIQUE INDEX customers_phone_adminId ON Customers (phone, adminId)');
                console.log('Created new composite index');
            } catch (e) {
                console.log('Composite index might already exist or error:', e.message);
            }

        } catch (error) {
            console.error('Index fix error (might be okay if already fixed):', error.message);
        }

        // 2. Restore Customers (Copy from Admin 1 to others)
        console.log('\nRestoring customers...');

        // Get all customers from Admin 1
        const admin1Customers = await sequelize.query(
            "SELECT * FROM Customers WHERE adminId = 1",
            { type: QueryTypes.SELECT }
        );

        console.log(`Found ${admin1Customers.length} customers for Admin 1`);

        // Get other admins
        const otherAdmins = await sequelize.query(
            "SELECT id FROM Users WHERE id != 1",
            { type: QueryTypes.SELECT }
        );

        for (const admin of otherAdmins) {
            console.log(`Processing Admin ${admin.id}...`);
            let count = 0;

            for (const cust of admin1Customers) {
                // Check if this customer already exists for this admin
                const [exists] = await sequelize.query(
                    "SELECT id FROM Customers WHERE phone = ? AND adminId = ?",
                    {
                        replacements: [cust.phone, admin.id],
                        type: QueryTypes.SELECT
                    }
                );

                if (!exists) {
                    // Insert copy
                    await sequelize.query(
                        "INSERT INTO Customers (name, phone, email, tags, adminId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
                        {
                            replacements: [cust.name, cust.phone, cust.email, JSON.stringify(cust.tags), admin.id]
                        }
                    );
                    count++;
                }
            }
            console.log(`  Restored ${count} customers for Admin ${admin.id}`);
        }

        console.log('\nDone! Please restart the backend.');
        process.exit(0);

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

fixAndRestore();
