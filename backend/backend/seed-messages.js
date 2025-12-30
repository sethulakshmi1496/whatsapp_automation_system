const { MessageCategory, User } = require('./src/models');
const sequelize = require('./src/config/db');

const welcomeMessages = [
    {
        title: "Welcome to [App Name]! 👋",
        body: "Thanks for taking the time to explore! This demo is designed to give you a quick, hands-on look at our core features. Dive right in and see what we can do for you!"
    },
    {
        title: "Your Test Drive Starts Now 🚀",
        body: "The keys are yours! Feel free to click, tap, and experiment with every part of the app. Don't worry about breaking anything—this environment is just for you to test the limits."
    },
    {
        title: "See the Future of [Industry/Task] ✨",
        body: "This isn't just an app; it's a glimpse into a more efficient way to handle [Main User Problem]. Use this demo to see how we simplify complex tasks and boost your productivity."
    },
    {
        title: "Quick Start: What Can You Do Here? 🤔",
        body: "In this demo, you can: 1. Create a [Key Item], 2. Explore the [Main Feature], and 3. See your [Result/Dashboard]. Follow the guided tour or go freestyle!"
    },
    {
        title: "We Value Your Feedback! 💡",
        body: "As you use this demo, pay attention to what you love and what could be better. Your experience is vital! There's a feedback button in the corner if you have thoughts to share."
    },
    {
        title: "Built for People Like You 🛠️",
        body: "Every feature in [App Name] was designed with [Target User] in mind. This demo focuses on the three most-requested tools. We hope they solve your biggest headaches!"
    },
    {
        title: "The Full Power, Zero Commitment 🔓",
        body: "This demo unlocks the premium experience without needing an account or payment. Use this opportunity to experience all the advanced settings and integrations we offer!"
    },
    {
        title: "Ready to Simplify [Task]? ✅",
        body: "Say goodbye to [Inefficient Current Process]! This demo will show you exactly how easy it is to manage your [Task/Data] in a few clicks. Your first success is just seconds away!"
    },
    {
        title: "Need a Hand? Look Here! 🧭",
        body: "This is a self-guided tour, but we've placed helpful tooltips (❓) next to the key features. Hover over them if you get stuck or want a deeper explanation of a function."
    },
    {
        title: "Congratulations on Starting! 🎉",
        body: "You've taken the first step toward better [Benefit]! We're excited for you to explore. When you're done, check out the 'Next Steps' screen to learn about getting your own account."
    }
];

const thankYouMessages = [
    {
        title: "Demo Complete! Thanks for Testing! 🥳",
        body: "We hope you enjoyed seeing [App Name] in action! You successfully explored our core features and saw the power of [Main Benefit]. Ready to bring this efficiency to your work?"
    },
    {
        title: "Great Work! You're Done. 👍",
        body: "That's the end of your demo session! Thanks for putting our app through its paces. If you have any final thoughts or questions, please reach out to our team anytime."
    },
    {
        title: "Thank You for Your Time! ⏰",
        body: "We know your time is valuable, and we appreciate you spending it with [App Name]. You've seen the potential—now let's talk about making it real for your business."
    },
    {
        title: "Feedback Makes Us Better! 💬",
        body: "Your test drive is complete! Before you go, we'd love to hear what stood out and what we can improve. Your input helps shape the future of [App Name]."
    },
    {
        title: "You Mastered the Demo! 🏆",
        body: "You successfully created [Key Item], used [Main Feature], and unlocked [Result]! You are now fully prepared to leverage the full version of our product."
    },
    {
        title: "Mission Accomplished! 💡",
        body: "Thank you for exploring the demo environment. We hope the process of [Specific Task] felt simple and intuitive. See how much time you can save with a full account!"
    },
    {
        title: "Ready for the Next Step? 🚀",
        body: "Thanks for a successful demo run! If you want to dive deeper, we offer personalized onboarding sessions. Click below to schedule a call with a product specialist."
    },
    {
        title: "Your Trial is Concluded. We Hope You Loved It! ❤️",
        body: "We appreciate you exploring what [App Name] can do. Everything you need to get started on your own account, including special launch offers, is waiting for you now."
    },
    {
        title: "Keep the Momentum Going! ✨",
        body: "You've taken a look under the hood and seen the value. Thank you for your interest! Let's schedule a follow-up to discuss how to integrate this into your existing workflow."
    },
    {
        title: "It Was Great Having You! 👋",
        body: "Thanks for stopping by the [App Name] demo! We truly believe our solution can revolutionize [Industry/Task]. We look forward to partnering with you!"
    }
];

async function seedMessages() {
    try {
        await sequelize.sync();

        // Get all admins
        const admins = await User.findAll();

        if (admins.length === 0) {
            console.log('No admins found. Please create an admin user first.');
            return;
        }

        console.log(`Found ${admins.length} admin(s). Seeding messages for each...`);

        for (const admin of admins) {
            console.log(`\nSeeding messages for admin: ${admin.email} (ID: ${admin.id})`);

            // Check if messages already exist for this admin
            const existingWelcome = await MessageCategory.count({
                where: { adminId: admin.id, category: 'Welcome' }
            });

            const existingThankYou = await MessageCategory.count({
                where: { adminId: admin.id, category: 'Thank You' }
            });

            if (existingWelcome > 0 || existingThankYou > 0) {
                console.log(`  Messages already exist for this admin. Skipping...`);
                continue;
            }

            // Seed Welcome messages
            const welcomeData = welcomeMessages.map(msg => ({
                adminId: admin.id,
                category: 'Welcome',
                title: msg.title,
                body: msg.body
            }));

            await MessageCategory.bulkCreate(welcomeData);
            console.log(`  ✓ Created ${welcomeMessages.length} Welcome messages`);

            // Seed Thank You messages
            const thankYouData = thankYouMessages.map(msg => ({
                adminId: admin.id,
                category: 'Thank You',
                title: msg.title,
                body: msg.body
            }));

            await MessageCategory.bulkCreate(thankYouData);
            console.log(`  ✓ Created ${thankYouMessages.length} Thank You messages`);
        }

        console.log('\n✅ Message seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding messages:', error);
        process.exit(1);
    }
}

seedMessages();
