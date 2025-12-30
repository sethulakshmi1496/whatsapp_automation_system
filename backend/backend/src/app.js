const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const customerRoutes = require('./routes/customerRoutes');
const templateRoutes = require('./routes/templateRoutes');
const messageRoutes = require('./routes/messageRoutes');
const messageCategoryRoutes = require('./routes/messageCategoryRoutes');
const googleAuthRoutes = require('./routes/googleAuthRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/message-categories', messageCategoryRoutes);
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/auth', googleAuthRoutes);

module.exports = app;

