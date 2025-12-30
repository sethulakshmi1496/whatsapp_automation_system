const { Message, Log } = require('../models');
const whatsappService = require('./whatsappService');

const processQueue = async () => {
    try {
        const now = new Date();

        // Find messages that are queued and either have no scheduled_at or scheduled_at is in the past
        const messages = await Message.findAll({
            where: {
                status: 'queued'
            },
            limit: 10
        });

        // Filter messages that are ready to be sent (scheduled_at is null or in the past)
        const readyMessages = messages.filter(msg => {
            if (!msg.scheduled_at) return true;
            return new Date(msg.scheduled_at) <= now;
        });

        if (readyMessages.length > 0) {
            console.log(`Processing ${readyMessages.length} messages from queue...`);
        }

        for (const msg of readyMessages) {
            const adminId = msg.adminId;

            // Check connection status for this specific admin
            const statusObj = whatsappService.getStatus(adminId);
            if (!statusObj || statusObj.status !== 'connected') {
                console.log(`WhatsApp not connected for admin ${adminId}, skipping message ${msg.id}`);
                continue;
            }

            try {
                // Use safeSendMessage with adminId
                const result = await whatsappService.safeSendMessage(adminId, msg.to_phone, msg.body);

                if (result.ok) {
                    msg.status = 'sent';
                    msg.sent_at = new Date();
                    await msg.save();
                    // Log creation might fail if Log model issues exist, wrap in try-catch or ignore
                    try {
                        await Log.create({ level: 'info', module: 'queue', event: 'message_sent', payload: { messageId: msg.id } });
                    } catch (e) { /* ignore log error */ }
                    console.log(`Message ${msg.id} sent successfully to ${msg.to_phone} (Admin ${adminId})`);
                } else {
                    throw new Error(result.error || 'Send failed');
                }
            } catch (error) {
                console.error(`Failed to send message ${msg.id} (Admin ${adminId})`, error);
                msg.status = 'failed';
                msg.error = error.message;
                msg.attempts = (msg.attempts || 0) + 1;
                await msg.save();
                try {
                    await Log.create({ level: 'error', module: 'queue', event: 'message_failed', payload: { messageId: msg.id, error: error.message } });
                } catch (e) { /* ignore log error */ }
            }
        }
    } catch (err) {
        console.error('Queue processing error:', err);
    }
};

const startQueue = () => {
    setInterval(processQueue, 5000);
    console.log('Queue worker started');
};

module.exports = { startQueue };
