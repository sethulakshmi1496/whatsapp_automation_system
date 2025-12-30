const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTemplates() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log('Current templates:');
        const [before] = await connection.execute('SELECT id, title, category FROM Templates ORDER BY id');
        console.table(before);

        // Remove duplicate templates (keep the first one of each)
        console.log('\n🗑️  Removing duplicates...');

        // Delete duplicate "order details" (keep ID 7, delete ID 8)
        await connection.execute('DELETE FROM Templates WHERE id = 8');
        console.log('✅ Deleted duplicate "order details" (ID 8)');

        // Delete duplicate "offer details" (keep ID 9, delete ID 10)
        await connection.execute('DELETE FROM Templates WHERE id = 10');
        console.log('✅ Deleted duplicate "offer details" (ID 10)');

        // Update remaining templates with categories
        console.log('\n📝 Adding categories to templates...');

        await connection.execute(`
      UPDATE Templates 
      SET category = 'orders' 
      WHERE id = 7
    `);
        console.log('✅ Updated "order details" with category "orders"');

        await connection.execute(`
      UPDATE Templates 
      SET category = 'offers' 
      WHERE id = 9
    `);
        console.log('✅ Updated "offer details" with category "offers"');

        // Show final result
        console.log('\n✅ Final templates:');
        const [after] = await connection.execute('SELECT id, title, category FROM Templates ORDER BY id');
        console.table(after);

        console.log('\n🎉 All done! Now refresh your browser and check the Send Message page.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixTemplates().catch(console.error);
