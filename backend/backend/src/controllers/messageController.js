const { Message, Customer, Template } = require('../models');

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

exports.send = async (req, res) => {
    const { to_phone, body, template_id } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
        console.error('[messageController] No adminId - unauthorized');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const message = await Message.create({
            adminId,
            to_phone,
            body,
            template_id,
            status: 'queued',
            job_id: generateId(),
            from_me: true
        });
        res.json({ ok: true, message });
    } catch (err) {
        console.error('[messageController] send error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.sendBatch = async (req, res) => {
    const { customer_ids, template_id, custom_body, category } = req.body;
    const adminId = req.user?.id;
    if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const jobId = generateId();
    try {
        const customers = await Customer.findAll({ where: { id: customer_ids } });

        let messages = [];

        if (category) {
            // Category-based randomized messaging
            const { MessageCategory, Template } = require('../models');

            // Check both message_categories and templates tables
            const categoryMessages = await MessageCategory.findAll({
                where: { adminId, category }
            });

            const templateMessages = await Template.findAll({
                where: { category }
            });

            // Combine both sources
            let allMessages = [];

            // Add message category messages
            if (categoryMessages.length > 0) {
                allMessages = categoryMessages.map(msg => ({
                    body: msg.body,
                    id: msg.id,
                    source: 'message_category'
                }));
            }

            // Add template messages
            if (templateMessages.length > 0) {
                const templateMsgs = templateMessages.map(tpl => ({
                    body: tpl.body,
                    id: tpl.id,
                    source: 'template'
                }));
                allMessages = [...allMessages, ...templateMsgs];
            }

            if (allMessages.length === 0) {
                return res.status(400).json({ error: 'No messages found in this category' });
            }

            // Shuffle all messages
            const shuffledMessages = [...allMessages].sort(() => Math.random() - 0.5);

            // Create messages with delays
            let currentDelay = 0;
            messages = customers.map((c, index) => {
                // Pick a message (cycle through shuffled messages if more customers than messages)
                const selectedMsg = shuffledMessages[index % shuffledMessages.length];

                // Random delay between 10-30 seconds
                const randomDelay = Math.floor(Math.random() * 21 + 10) * 1000; // 10-30 seconds in ms
                currentDelay += randomDelay;

                let body = selectedMsg.body;
                body = body.replace(/{{name}}/g, c.name).replace(/{{phone}}/g, c.phone);

                const scheduledAt = new Date(Date.now() + currentDelay);

                return {
                    adminId,
                    to_phone: c.phone,
                    body,
                    template_id: selectedMsg.source === 'template' ? selectedMsg.id : null,
                    category_id: selectedMsg.source === 'message_category' ? selectedMsg.id : null,
                    status: 'queued',
                    job_id: jobId,
                    from_me: true,
                    scheduled_at: scheduledAt
                };
            });
        } else {
            // Original template/custom body logic
            const template = template_id ? await Template.findByPk(template_id) : null;
            messages = customers.map(c => {
                let body = custom_body || (template ? template.body : '');
                body = body.replace(/{{name}}/g, c.name).replace(/{{phone}}/g, c.phone);
                return {
                    adminId,
                    to_phone: c.phone,
                    body,
                    template_id,
                    status: 'queued',
                    job_id: jobId,
                    from_me: true
                };
            });
        }

        await Message.bulkCreate(messages);
        res.json({ ok: true, message: 'Batch queued', job_id: jobId, count: messages.length });
    } catch (err) {
        console.error('[messageController] sendBatch error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getLogs = async (req, res) => {
    const adminId = req.user?.id;
    if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const logs = await Message.findAll({
            where: { adminId },
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
