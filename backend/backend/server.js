// backend/server.js
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const app = require('./src/app');
const { sequelize } = require('./src/models');
const whatsappService = require('./src/services/whatsappService');
const queueService = require('./src/services/queueService');
require('dotenv').config();
const bodyParser = require('body-parser');

const server = http.createServer(app);

// socket.io
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(bodyParser.json({ limit: '1mb' }));

// ========== Basic endpoints ==========

// health
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));


// NOTE: /api/customers endpoint is now handled by customerRoutes in app.js
// The duplicate endpoint has been removed to avoid conflicts
const authMiddleware = require('./src/middleware/authMiddleware');


// send-message endpoint (uses safeSendMessage)
app.post('/api/send-message', authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { phone, text } = req.body || {};
    if (!phone || !text) return res.status(400).json({ ok: false, error: 'phone and text required' });

    console.log(`/api/send-message request from admin ${adminId}`, { phone: phone?.slice?.(-6), textLength: text.length });
    const result = await whatsappService.safeSendMessage(adminId, phone, text);

    if (result?.ok) {
      console.log(`/api/send-message success for admin ${adminId}`, { phone: phone?.slice?.(-6) });
      return res.json({ ok: true, result: result.result });
    }

    console.warn(`/api/send-message failed for admin ${adminId}`, { phone: phone?.slice?.(-6), error: result?.error });
    return res.status(500).json({ ok: false, error: result?.error || 'send failed' });
  } catch (err) {
    console.error('/api/send-message unexpected error', err && (err.stack || err.message || err));
    return res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// admin: force QR (move auth -> reinit)
app.post('/api/force-qr', authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    await whatsappService.forceReinit(adminId);
    return res.json({ ok: true });
  } catch (e) {
    console.error('/api/force-qr error', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// get WhatsApp status
app.get('/api/whatsapp/status', authMiddleware, (req, res) => {
  try {
    const adminId = req.user.id;
    const status = whatsappService.getStatus(adminId);
    return res.json({ ok: true, status });
  } catch (e) {
    console.error('/api/whatsapp/status error', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// admin: explicit disconnect (admin-triggered only)
app.post('/api/whatsapp/disconnect', authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const resetAuth = (req.body && typeof req.body.resetAuth === 'boolean') ? req.body.resetAuth : true;
    const result = await whatsappService.disconnect(adminId, { resetAuth });
    return res.json(result);
  } catch (e) {
    console.error('/api/whatsapp/disconnect error', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// socket.io with admin rooms
io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  // Client should send their adminId to join their room
  socket.on('join', async (data) => {
    try {
      const { adminId } = data;
      if (!adminId) {
        console.warn('Client tried to join without adminId');
        return;
      }

      socket.join(`admin-${adminId}`);
      console.log(`Client ${socket.id} joined room admin-${adminId}`);

      // Send current status to this admin
      const statusObj = whatsappService.getStatus(adminId);
      socket.emit('status', statusObj);

      // Send current QR if available
      const currentQr = whatsappService.getQr(adminId);
      if (currentQr) {
        socket.emit('qr', { qr: currentQr });
      }

      // Initialize WhatsApp for this admin if not already done
      if (statusObj.status === 'disconnected') {
        console.log(`[server] Initializing WhatsApp for admin ${adminId}`);
        whatsappService.initWhatsApp(io, adminId);
      }
    } catch (e) {
      console.error('Socket join error:', e);
    }
  });

  socket.on('disconnect', () => console.log('Client disconnected', socket.id));
});

// ========== Start services ==========

// WhatsApp service will be initialized per admin when they connect via socket.io
// No global initialization needed

// Helper to find available port
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const testServer = http.createServer();
    testServer.listen(startPort, () => {
      testServer.close(() => resolve(startPort));
    });
    testServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

// Start DB and other services but do not block QR generation
(async function start() {
  try {
    try {
      await sequelize.sync({ alter: true });
      console.log('Database synced');
    } catch (e) {
      console.warn('Database sync failed, continuing without DB:', e.message);
    }

    if (queueService && typeof queueService.startQueue === 'function') {
      try { queueService.startQueue(); } catch (e) { console.warn('queue start failed', e?.message || e); }
    }

    const desiredPort = process.env.PORT || 3000;
    const port = await findAvailablePort(Number(desiredPort));

    server.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();

// ========== Global error handlers (prevents process crash) ==========
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED PROMISE REJECTION:', reason, p);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err && (err.stack || err.message || err));
});
