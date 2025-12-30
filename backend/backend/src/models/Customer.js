const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Customer = sequelize.define('Customer', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING },
    tags: { type: DataTypes.JSON, defaultValue: [] },
    adminId: { type: DataTypes.INTEGER, allowNull: false }
}, {
    indexes: [
        { unique: true, fields: ['phone', 'adminId'] }
    ]
});

module.exports = Customer;
