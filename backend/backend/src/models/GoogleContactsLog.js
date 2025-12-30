// backend/src/models/GoogleContactsLog.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GoogleContactsLog = sequelize.define('GoogleContactsLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    adminId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    customerName: {
        type: DataTypes.STRING
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    success: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    contactId: {
        type: DataTypes.STRING,
        comment: 'Google Contact resource name'
    },
    errorMessage: {
        type: DataTypes.TEXT
    },
    duration: {
        type: DataTypes.INTEGER,
        comment: 'Duration in milliseconds'
    }
}, {
    indexes: [
        { fields: ['adminId'] },
        { fields: ['success'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = GoogleContactsLog;
