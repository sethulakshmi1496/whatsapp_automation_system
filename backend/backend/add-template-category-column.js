const mysql = require('mysql2/promise');
require('dotenv').config();

async function addCategoryColumn() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log('Checking if category column exists in Templates table...');

        // Check if column already exists
        const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'Templates' 
      AND COLUMN_NAME = 'category'
    `, [process.env.DB_NAME]);

        if (columns.length > 0) {
            console.log('✅ Category column already exists!');
        } else {
            console.log('Adding category column to Templates table...');

            await connection.execute(`
        ALTER TABLE Templates 
        ADD COLUMN category VARCHAR(255) NULL AFTER body
      `);

            console.log('✅ Category column added successfully!');
        }

        // Show current templates
        const [templates] = await connection.execute('SELECT id, title, category FROM Templates');
        console.log('\nCurrent templates:');
        console.table(templates);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

addCategoryColumn().catch(console.error);
