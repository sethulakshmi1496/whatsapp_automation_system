const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WhatsappAuth = sequelize.define('WhatsappAuth', {
    adminId: { type: DataTypes.INTEGER, allowNull: false },
    key: { type: DataTypes.STRING, allowNull: false },
    value: { type: DataTypes.TEXT('long'), allowNull: false }
}, {
    indexes: [
        { unique: true, fields: ['adminId', 'key'] }
    ]
});

module.exports = WhatsappAuth;
