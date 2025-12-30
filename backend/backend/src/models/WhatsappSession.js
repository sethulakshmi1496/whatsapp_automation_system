const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WhatsappSession = sequelize.define('WhatsappSession', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    adminId: { type: DataTypes.INTEGER, allowNull: true }, // Temporarily nullable for migration
    session_data: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'disconnected' },
    device_name: { type: DataTypes.STRING },
    last_seen: { type: DataTypes.DATE }
});

module.exports = WhatsappSession;
