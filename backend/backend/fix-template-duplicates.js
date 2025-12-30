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

        // Fix 1: Delete duplicate "order summery" (keep ID 11, delete ID 12)
        console.log('\n🗑️  Deleting duplicate template...');
        await connection.execute('DELETE FROM Templates WHERE id = 12');
        console.log('✅ Deleted duplicate "order summery" (ID 12)');

        // Fix 2: Standardize category name - change "order" to "orders" for consistency
        console.log('\n📝 Standardizing category names...');
        await connection.execute(`
      UPDATE Templates 
      SET category = 'orders' 
      WHERE category = 'order'
    `);
        console.log('✅ Changed category "order" to "orders" for consistency');

        // Show final result
        console.log('\n✅ Final templates:');
        const [after] = await connection.execute('SELECT id, title, category FROM Templates ORDER BY category, id');
        console.table(after);

        console.log('\n🎉 All done! Refresh your browser to see the changes.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixTemplates().catch(console.error);
