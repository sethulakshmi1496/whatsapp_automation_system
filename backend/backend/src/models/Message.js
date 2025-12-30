const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Message = sequelize.define('Message', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    adminId: { type: DataTypes.INTEGER, allowNull: false },
    whatsapp_id: { type: DataTypes.STRING, unique: true },
    from_me: { type: DataTypes.BOOLEAN, defaultValue: false },
    job_id: { type: DataTypes.STRING },
    to_phone: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT },
    template_id: { type: DataTypes.INTEGER },
    category_id: { type: DataTypes.INTEGER }, // For category-based messages
    type: { type: DataTypes.STRING, defaultValue: 'text' },
    status: { type: DataTypes.STRING, defaultValue: 'queued' }, // queued, sent, delivered, read, received
    attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    error: { type: DataTypes.TEXT },
    sent_at: { type: DataTypes.DATE },
    scheduled_at: { type: DataTypes.DATE }, // For delayed sending
    timestamp: { type: DataTypes.DATE }
});

module.exports = Message;

