const { Message, Customer } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

exports.getConversations = async (req, res) => {
    const adminId = req.user.id;
    try {
        // Optimized query to get customers with their last message
        // This avoids N+1 queries and is much faster
        const query = `
            SELECT 
                c.id, c.name, c.phone, c.tags,
                m.body as msg_body,
                m.timestamp as msg_timestamp,
                m.from_me as msg_from_me,
                m.status as msg_status
            FROM Customers c
            LEFT JOIN (
                SELECT m1.*
                FROM Messages m1
                INNER JOIN (
                    SELECT to_phone, MAX(timestamp) as max_time
                    FROM Messages
                    WHERE adminId = :adminId
                    GROUP BY to_phone
                ) m2 ON m1.to_phone = m2.to_phone AND m1.timestamp = m2.max_time
                WHERE m1.adminId = :adminId
            ) m ON c.phone = m.to_phone
            WHERE c.adminId = :adminId
            ORDER BY m.timestamp DESC, c.updatedAt DESC
        `;

        const results = await sequelize.query(query, {
            replacements: { adminId },
            type: sequelize.QueryTypes.SELECT
        });

        // Format results to match expected frontend structure
        const conversations = results.map(row => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
            lastMessage: row.msg_body ? {
                body: row.msg_body,
                timestamp: row.msg_timestamp,
                from_me: !!row.msg_from_me, // Ensure boolean
                status: row.msg_status
            } : null
        }));

        res.json({ conversations });
    } catch (err) {
        console.error('Get conversations error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getMessages = async (req, res) => {
    const adminId = req.user.id;
    const { phone } = req.params;

    try {
        const messages = await Message.findAll({
            where: {
                adminId,
                to_phone: phone
            },
            order: [['timestamp', 'ASC']]
        });

        res.json({ messages });
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: err.message });
    }
};
