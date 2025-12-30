// backend/server.js
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = require('./src/app');
const { sequelize } = require('./src/models');
const whatsappService = require('./src/services/whatsappService');
const queueService = require('./src/services/queueService');
const authMiddleware = require('./src/middleware/authMiddleware');

const server = http.createServer(app);

// socket.io with Render-friendly configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true
});

app.use(bodyParser.json({ limit: '1mb' }));

// ================= BASIC ENDPOINTS =================

// health check (used by Render)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date() });
});

// ================= API ROUTES =================

// send message
app.post('/api/send-message', authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { phone, text } = req.body || {};

    if (!phone || !text) {
      return res.status(400).json({ ok: false, error: 'phone and text required' });
    }

    const result = await whatsappService.safeSendMessage(adminId, phone, text);

    if (result?.ok) {
      return res.json({ ok: true, result: result.result });
    }

    return res.status(500).json({
      ok: false,
      error: result?.error || 'send failed',
    });
  } catch (err) {
    console.error('/api/send-message error:', err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// force QR regeneration
app.post('/api/force-qr', authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    await whatsappService.forceReinit(adminId);
    res.json({ ok: true });
  } catch (err) {
    console.error('/api/force-qr error:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// WhatsApp status
app.get('/api/whatsapp/status', authMiddleware, (req, res) => {
  try {
    const adminId = req.user.id;
    const status = whatsappService.getStatus(adminId);
    res.json({ ok: true, status });
  } catch (err) {
    console.error('/api/whatsapp/status error:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// WhatsApp disconnect
app.post('/api/whatsapp/disconnect', authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const resetAuth =
      typeof req.body?.resetAuth === 'boolean' ? req.body.resetAuth : true;

    const result = await whatsappService.disconnect(adminId, { resetAuth });
    res.json(result);
  } catch (err) {
    console.error('/api/whatsapp/disconnect error:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ================= SOCKET.IO =================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', async ({ adminId }) => {
    if (!adminId) return;

    socket.join(`admin-${adminId}`);
    console.log(`Socket ${socket.id} joined admin-${adminId}`);

    const status = whatsappService.getStatus(adminId);
    socket.emit('status', status);

    const qr = whatsappService.getQr(adminId);
    if (qr) socket.emit('qr', { qr });

    if (status.status === 'disconnected') {
      whatsappService.initWhatsApp(io, adminId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ================= START SERVER =================

(async function start() {
  try {
    try {
      await sequelize.sync({ alter: true });
      console.log('Database synced');
    } catch (dbErr) {
      console.warn('Database sync failed, continuing:', dbErr.message);
    }

    if (queueService?.startQueue) {
      try {
        queueService.startQueue();
      } catch (qErr) {
        console.warn('Queue start failed:', qErr.message);
      }
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
})();

// ================= GLOBAL ERROR HANDLERS =================

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
