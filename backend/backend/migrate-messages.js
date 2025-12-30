const { sequelize } = require('./src/models');

async function migrateMessages() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        const queryInterface = sequelize.getQueryInterface();

        // Add columns if they don't exist
        try {
            await queryInterface.addColumn('Messages', 'adminId', {
                type: 'INTEGER',
                allowNull: true // Temporarily true
            });
            console.log('Added adminId column');
        } catch (e) { console.log('adminId column might already exist'); }

        try {
            await queryInterface.addColumn('Messages', 'whatsapp_id', {
                type: 'VARCHAR(255)',
                unique: true
            });
            console.log('Added whatsapp_id column');
        } catch (e) { console.log('whatsapp_id column might already exist'); }

        try {
            await queryInterface.addColumn('Messages', 'from_me', {
                type: 'BOOLEAN',
                defaultValue: false
            });
            console.log('Added from_me column');
        } catch (e) { console.log('from_me column might already exist'); }

        try {
            await queryInterface.addColumn('Messages', 'timestamp', {
                type: 'DATETIME'
            });
            console.log('Added timestamp column');
        } catch (e) { console.log('timestamp column might already exist'); }

        // Update existing messages to have adminId = 1 (default)
        await sequelize.query("UPDATE Messages SET adminId = 1 WHERE adminId IS NULL");
        console.log('Updated existing messages with adminId = 1');

        // Now make adminId NOT NULL (if supported by dialect easily, or just leave it nullable for now)
        // Sequelize sync will handle it later if we restart with alter: true

        console.log('Message migration complete');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrateMessages();
