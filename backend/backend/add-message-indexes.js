const { sequelize } = require('./src/models');

async function addMessageIndexes() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        const queryInterface = sequelize.getQueryInterface();

        // Add index for adminId and to_phone for faster chat history retrieval
        try {
            await queryInterface.addIndex('Messages', ['adminId', 'to_phone'], {
                name: 'messages_admin_phone_idx'
            });
            console.log('Added index: messages_admin_phone_idx');
        } catch (e) {
            console.log('Index messages_admin_phone_idx might already exist');
        }

        // Add index for timestamp for sorting
        try {
            await queryInterface.addIndex('Messages', ['timestamp'], {
                name: 'messages_timestamp_idx'
            });
            console.log('Added index: messages_timestamp_idx');
        } catch (e) {
            console.log('Index messages_timestamp_idx might already exist');
        }

        console.log('Index addition complete');
        process.exit(0);
    } catch (error) {
        console.error('Index error:', error);
        process.exit(1);
    }
}

addMessageIndexes();
