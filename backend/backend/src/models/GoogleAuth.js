// backend/src/models/GoogleAuth.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GoogleAuth = sequelize.define('GoogleAuth', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    adminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    accessToken: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE
    }
}, {
    indexes: [
        { unique: true, fields: ['adminId'] }
    ]
});

module.exports = GoogleAuth;
