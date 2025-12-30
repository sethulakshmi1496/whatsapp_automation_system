const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MessageCategory = sequelize.define('MessageCategory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    adminId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Category name like Welcome, Thank You, etc.'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'message_categories',
    timestamps: true
});

module.exports = MessageCategory;
