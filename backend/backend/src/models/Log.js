const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Log = sequelize.define('Log', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    level: { type: DataTypes.STRING },
    module: { type: DataTypes.STRING },
    event: { type: DataTypes.STRING },
    payload: { type: DataTypes.JSON }
});

module.exports = Log;
