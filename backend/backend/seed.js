const { sequelize, User, Customer, Template } = require('./src/models');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        console.log('🌱 Seeding database...');

        // Sync database
        await sequelize.sync({ force: false });

        // Create sample user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await User.findOrCreate({
            where: { email: 'admin@example.com' },
            defaults: {
                email: 'admin@example.com',
                password_hash: hashedPassword,
                role: 'admin'
            }
        });
        console.log('✅ Sample user created: admin@example.com / admin123');

        // Create sample customers
        const sampleCustomers = [
            { name: 'John Doe', phone: '1234567890', email: 'john@example.com', tags: ['vip', 'customer'] },
            { name: 'Jane Smith', phone: '0987654321', email: 'jane@example.com', tags: ['customer'] },
            { name: 'Bob Johnson', phone: '5555555555', email: 'bob@example.com', tags: ['lead'] },
            { name: 'Alice Williams', phone: '4444444444', email: 'alice@example.com', tags: ['vip'] },
            { name: 'Charlie Brown', phone: '3333333333', email: 'charlie@example.com', tags: ['customer'] }
        ];

        for (const customer of sampleCustomers) {
            await Customer.findOrCreate({
                where: { phone: customer.phone },
                defaults: customer
            });
        }
        console.log(`✅ ${sampleCustomers.length} sample customers created`);

        // Create sample templates
        const sampleTemplates = [
            {
                title: 'Welcome Message',
                body: 'Hello {{name}}! Welcome to our service. We\'re excited to have you with us. If you have any questions, feel free to reach out at {{phone}}.',
                media_url: null
            },
            {
                title: 'Order Confirmation',
                body: 'Hi {{name}}, your order has been confirmed! We\'ll notify you once it\'s ready for pickup. Order ID: #12345',
                media_url: null
            },
            {
                title: 'Appointment Reminder',
                body: 'Dear {{name}}, this is a reminder about your appointment tomorrow at 2:00 PM. Please call {{phone}} if you need to reschedule.',
                media_url: null
            },
            {
                title: 'Special Offer',
                body: 'Hey {{name}}! 🎉 We have a special offer just for you! Get 20% off on your next purchase. Use code: SAVE20',
                media_url: null
            },
            {
                title: 'Thank You Message',
                body: 'Thank you {{name}} for choosing us! We appreciate your business and look forward to serving you again.',
                media_url: null
            }
        ];

        for (const template of sampleTemplates) {
            await Template.findOrCreate({
                where: { title: template.title },
                defaults: template
            });
        }
        console.log(`✅ ${sampleTemplates.length} sample templates created`);

        console.log('');
        console.log('🎉 Database seeding completed successfully!');
        console.log('');
        console.log('📝 Login credentials:');
        console.log('   Email: admin@example.com');
        console.log('   Password: admin123');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
