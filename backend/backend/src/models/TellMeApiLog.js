// backend/src/models/TellMeApiLog.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TellMeApiLog = sequelize.define('TellMeApiLog', {
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
    message: {
        type: DataTypes.TEXT
    },
    apiUrl: {
        type: DataTypes.STRING
    },
    requestPayload: {
        type: DataTypes.JSON
    },
    responseStatus: {
        type: DataTypes.INTEGER
    },
    responseBody: {
        type: DataTypes.JSON
    },
    success: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    errorMessage: {
        type: DataTypes.TEXT
    },
    attemptNumber: {
        type: DataTypes.INTEGER,
        defaultValue: 1
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

module.exports = TellMeApiLog;
