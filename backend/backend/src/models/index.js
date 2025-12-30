const sequelize = require('../config/db');
const User = require('./User');
const WhatsappSession = require('./WhatsappSession');
const Customer = require('./Customer');
const Template = require('./Template');
const Message = require('./Message');
const Log = require('./Log');
const WhatsappAuth = require('./WhatsappAuth');
const MessageCategory = require('./MessageCategory');
const TellMeApiLog = require('./TellMeApiLog');
const GoogleAuth = require('./GoogleAuth');
const GoogleContactsLog = require('./GoogleContactsLog');

// Associations
Message.belongsTo(Template, { foreignKey: 'template_id' });
Template.hasMany(Message, { foreignKey: 'template_id' });

module.exports = {
    sequelize,
    User,
    WhatsappSession,
    Customer,
    Template,
    Message,
    Log,
    WhatsappAuth,
    MessageCategory,
    TellMeApiLog,
    GoogleAuth,
    GoogleContactsLog
};
