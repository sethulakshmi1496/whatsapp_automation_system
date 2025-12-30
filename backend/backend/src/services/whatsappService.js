// backend/src/services/whatsappService.js
/**
 * Multi-tenant WhatsApp service:
 * - Manages separate WhatsApp connections for each admin
 * - Stores auth credentials in MySQL database
 * - Complete isolation between admins and their customers
 */

const { makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const pino = require('pino');
const { useMySQLAuthState } = require('./baileysAuthService');

// Store active connections: Map<adminId, { sock, isConnected, currentQr, adminPhone }>
const connections = new Map();
let ioInstance = null;

/* Safe emit helper */
function emit(event, payload, adminId = null) {
  try {
    if (ioInstance && typeof ioInstance.emit === 'function') {
      if (adminId) {
        // Emit to specific admin's room
        ioInstance.to(`admin-${adminId}`).emit(event, payload);
      } else {
        ioInstance.emit(event, payload);
      }
    }
  } catch (e) {
    console.warn('[whatsappService] emit error', e && e.message);
  }
}

async function initWhatsApp(io, adminId) {
  ioInstance = io || ioInstance;

  if (!adminId) {
    console.error('[whatsappService] adminId is required for initWhatsApp');
    return;
  }

  // Check if already initializing or connected
  const existing = connections.get(adminId);
  if (existing && existing.initializing) {
    console.log(`[whatsappService] Admin ${adminId} already initializing`);
    return;
  }

  console.log(`[whatsappService] initWhatsApp starting for admin ${adminId}`);

  // Mark as initializing
  connections.set(adminId, { ...existing, initializing: true });

  try {
    // Clean up previous socket if exists
    if (existing && existing.sock) {
      try { existing.sock.ev.removeAllListeners(); } catch (err) { /* ignore */ }
      try { existing.sock.end(); } catch (err) { /* ignore */ }
    }

    // Get auth state from MySQL
    const { state, saveCreds } = await useMySQLAuthState(adminId);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      getMessage: async () => ({}),
      connectTimeoutMs: 60000,
    });

    sock.ev.on('connection.update', async (update) => {
      try {
        const { connection, lastDisconnect, qr } = update;
        console.log(`[whatsappService] Admin ${adminId} connection.update`, { connection, hasQr: !!qr });

        if (qr) {
          try {
            const qrImage = await qrcode.toDataURL(qr);
            const conn = connections.get(adminId) || {};
            connections.set(adminId, { ...conn, currentQr: qrImage });
            emit('qr', { qr: qrImage }, adminId);
            console.log(`[whatsappService] Admin ${adminId} emitted qr`);
          } catch (e) {
            console.error(`[whatsappService] Admin ${adminId} qr generation error`, e && e.message);
            emit('status', { status: 'qr_error', error: String(e) }, adminId);
          }
        }

        if (connection === 'open') {
          const adminPhone = sock.user?.id.split(':')[0].replace('@s.whatsapp.net', '');
          connections.set(adminId, {
            sock,
            isConnected: true,
            currentQr: null,
            adminPhone,
            initializing: false
          });

          emit('status', { status: 'connected', user: sock.user }, adminId);
          console.log(`[whatsappService] Admin ${adminId} connected as`, sock.user?.id || sock.user);
          console.log(`[whatsappService] Admin ${adminId} phone stored:`, adminPhone);
          emit('admin_connected', { phone: adminPhone, user: sock.user }, adminId);
        } else if (connection === 'close') {
          const conn = connections.get(adminId) || {};
          connections.set(adminId, { ...conn, isConnected: false, initializing: false });
          emit('status', { status: 'disconnected' }, adminId);
          console.log(`[whatsappService] Admin ${adminId} connection closed`, lastDisconnect?.error || lastDisconnect);

          const reasonText = String(lastDisconnect?.error || '');
          const isLoggedOut = reasonText.toLowerCase().includes('loggedout') ||
            reasonText.includes('401') ||
            reasonText.toLowerCase().includes('unauthorized');

          if (isLoggedOut) {
            console.warn(`[whatsappService] Admin ${adminId} detected loggedOut/401 by server`);
            emit('status', { status: 'loggedOut', error: reasonText }, adminId);

            // Automatically clear auth and reinit to show QR immediately
            const { WhatsappAuth } = require('../models');
            await WhatsappAuth.destroy({ where: { adminId } });
            console.log(`[whatsappService] Admin ${adminId} cleared auth due to 401/logout`);

            // Re-init after a short delay
            setTimeout(() => initWhatsApp(ioInstance, adminId), 1000);
            return;
          }

          // Transient disconnect: try reconnect
          setTimeout(() => {
            try { initWhatsApp(ioInstance, adminId); } catch (e) {
              console.error(`[whatsappService] Admin ${adminId} reconnect init failed`, e && e.message);
            }
          }, 2000);
        }
      } catch (e) {
        console.error(`[whatsappService] Admin ${adminId} connection.update handler error`, e && e.message);
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Listen for incoming messages to auto-add customers
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      try {
        console.log(`[whatsappService] Admin ${adminId} messages.upsert received type=${type}, count=${messages.length}`);

        if (type !== 'notify') return;

        for (const msg of messages) {
          console.log(`[whatsappService] Admin ${adminId} Processing message:`, JSON.stringify(msg.key));

          if (msg.key.fromMe) {
            console.log(`[whatsappService] Admin ${adminId} Skipping own message`);
            continue;
          }

          const senderId = msg.key.remoteJid;
          if (!senderId || senderId === 'status@broadcast') {
            console.log(`[whatsappService] Admin ${adminId} Skipping invalid/status sender:`, senderId);
            continue;
          }

          if (senderId.includes('@g.us')) {
            console.log(`[whatsappService] Admin ${adminId} Skipping group message:`, senderId);
            continue;
          }

          // Extract REAL phone number (handle LID)
          let phoneNumber = null;

          if (msg.key.participant) {
            if (msg.key.participant.endsWith('@lid') && msg.key.participantAlt) {
              phoneNumber = msg.key.participantAlt.split('@')[0].split(':')[0];
            } else {
              phoneNumber = msg.key.participant.split('@')[0].split(':')[0];
            }
          } else if (senderId.endsWith('@lid') && msg.key.remoteJidAlt) {
            phoneNumber = msg.key.remoteJidAlt.split('@')[0].split(':')[0];
          } else if (senderId.includes('@s.whatsapp.net')) {
            phoneNumber = senderId.split('@')[0].split(':')[0];
          }

          console.log(`[whatsappService] Admin ${adminId} Extracted phone number:`, phoneNumber);

          if (!phoneNumber || !/^\d{8,16}$/.test(phoneNumber)) {
            console.log(`[whatsappService] Admin ${adminId} Skipping invalid phone number format:`, phoneNumber, 'from', senderId);
            continue;
          }

          // Skip if this is the admin's own number
          const conn = connections.get(adminId);
          if (conn && conn.adminPhone && phoneNumber === conn.adminPhone) {
            console.log(`[whatsappService] Admin ${adminId} Skipping admin number:`, phoneNumber);
            continue;
          }

          const senderName = msg.pushName || msg.verifiedBizName || `Customer ${phoneNumber.slice(-4)}`;
          console.log(`[whatsappService] Admin ${adminId} Detected sender name:`, senderName);

          // Auto-add to customer database with adminId
          try {
            const { Customer, Message } = require('../models');

            const existingCustomer = await Customer.findOne({
              where: { phone: phoneNumber, adminId }
            });

            if (!existingCustomer) {
              const newCustomer = await Customer.create({
                name: senderName,
                phone: phoneNumber,
                email: null,
                tags: ['incoming-message', 'auto-added'],
                adminId
              });
              console.log(`[whatsappService] Admin ${adminId} SUCCESS: Auto-added customer:`, newCustomer.id, phoneNumber, senderName);

              // ========== TELL ME API INTEGRATION START ==========
              try {
                const tellMeService = require('./tellMeApiService');

                if (tellMeService.isEnabled()) {
                  // Get message content for API call
                  const messageContent = msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.imageMessage?.caption ||
                    '[Media Message]';

                  // Call API asynchronously (non-blocking, fire-and-forget)
                  tellMeService.callTellMeApi({
                    customerName: newCustomer.name,
                    phoneNumber: newCustomer.phone,
                    message: messageContent,
                    adminId: adminId,
                    timestamp: new Date()
                  }).catch(err => {
                    // Log error but don't throw - never break WhatsApp flow
                    console.error('[whatsappService] TellMeAPI call failed:', err.message);
                  });
                }
              } catch (apiError) {
                // Catch any errors to prevent WhatsApp flow disruption
                console.error('[whatsappService] TellMeAPI integration error:', apiError.message);
              }
              // ========== TELL ME API INTEGRATION END ==========

              emit('customer_added', { customer: newCustomer }, adminId);
            } else {
              // ... existing update logic ...
              if (senderName && senderName !== existingCustomer.name && !senderName.startsWith('Customer ')) {
                await existingCustomer.update({ name: senderName });
                console.log(`[whatsappService] Admin ${adminId} Updated customer name:`, phoneNumber, senderName);
              }
              const tags = existingCustomer.tags || [];
              if (!tags.includes('incoming-message')) {
                tags.push('incoming-message');
                await existingCustomer.update({ tags });
              }
            }

            // --- SAVE INCOMING MESSAGE ---
            const messageContent = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              '[Media Message]';

            const msgTimestamp = new Date((msg.messageTimestamp || Date.now() / 1000) * 1000);

            await Message.create({
              adminId,
              whatsapp_id: msg.key.id,
              from_me: false,
              to_phone: phoneNumber, // For incoming, this is actually 'from_phone', but we store the other party's phone here
              body: messageContent,
              type: 'text',
              status: 'received',
              timestamp: msgTimestamp
            });

            console.log(`[whatsappService] Admin ${adminId} Saved incoming message from ${phoneNumber} (DB ID: created)`);
            emit('new_message', {
              phone: phoneNumber,
              body: messageContent,
              from_me: false,
              timestamp: msgTimestamp
            }, adminId);

          } catch (err) {
            console.error(`[whatsappService] Admin ${adminId} Failed to process/save message:`, err);
          }
        }
      } catch (err) {
        console.error(`[whatsappService] Admin ${adminId} messages.upsert handler error:`, err && err.message);
      }
    });

    // Update connection map
    const conn = connections.get(adminId) || {};
    connections.set(adminId, { ...conn, sock, initializing: false });

    console.log(`[whatsappService] Admin ${adminId} initWhatsApp complete`);
  } catch (err) {
    console.error(`[whatsappService] Admin ${adminId} initWhatsApp error`, err && (err.stack || err.message || err));
    emit('status', { status: 'error', error: String(err) }, adminId);
    const conn = connections.get(adminId) || {};
    connections.set(adminId, { ...conn, initializing: false });
  }
}

/* Raw send - may throw (internal use only) */
const _sendMessageRaw = async (adminId, phone, text) => {
  const conn = connections.get(adminId);
  if (!conn || !conn.sock) throw new Error('WhatsApp not initialized for this admin');
  const id = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
  return await conn.sock.sendMessage(id, { text });
};

/**
 * safeSendMessage - always returns { ok: boolean, result?, error? }
 */
const safeSendMessage = async (adminId, phone, text) => {
  try {
    const conn = connections.get(adminId);
    if (!conn || !conn.sock) return { ok: false, error: 'WhatsApp not initialized for this admin' };

    if (!phone || typeof phone !== 'string') return { ok: false, error: 'Invalid phone' };
    const digits = phone.replace(/[^+\d]/g, '');
    if (!digits.match(/\d{6,}$/)) return { ok: false, error: 'Phone number seems invalid' };

    const res = await _sendMessageRaw(adminId, digits, text);

    // --- SAVE OUTGOING MESSAGE ---
    try {
      const { Message } = require('../models');
      console.log(`[whatsappService] Admin ${adminId} Saving outgoing message to DB...`);
      const savedMsg = await Message.create({
        adminId,
        whatsapp_id: res?.key?.id || `OUT-${Date.now()}`,
        from_me: true,
        to_phone: digits,
        body: text,
        type: 'text',
        status: 'sent',
        sent_at: new Date(),
        timestamp: new Date()
      });
      console.log(`[whatsappService] Admin ${adminId} Saved outgoing message to ${digits} (DB ID: ${savedMsg.id})`);

      // Emit to frontend so other tabs/windows update instantly
      emit('new_message', {
        phone: digits,
        body: text,
        from_me: true,
        timestamp: new Date()
      }, adminId);

    } catch (dbErr) {
      console.error(`[whatsappService] Admin ${adminId} Failed to save outgoing message:`, dbErr);
    }

    return { ok: true, result: res };
  } catch (err) {
    const msg = err && (err.message || String(err)) || 'unknown error';
    console.error(`[whatsappService] Admin ${adminId} safeSendMessage error:`, msg);

    if (msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('loggedout')) {
      emit('status', { status: 'auth_error', error: msg }, adminId);
    }

    return { ok: false, error: msg };
  }
};

const getStatus = (adminId) => {
  console.log(`[whatsappService] getStatus called for adminId: ${adminId}`);
  const conn = connections.get(adminId);
  console.log(`[whatsappService] Connection found:`, !!conn, 'isConnected:', conn?.isConnected);

  if (conn && conn.isConnected) {
    console.log(`[whatsappService] conn.adminPhone:`, conn.adminPhone);
    console.log(`[whatsappService] conn.sock.user:`, JSON.stringify(conn.sock?.user));

    const result = {
      status: 'connected',
      user: {
        name: conn.sock?.user?.name || conn.sock?.user?.notify || 'WhatsApp User',
        id: conn.adminPhone || conn.sock?.user?.id?.split(':')[0]?.replace('@s.whatsapp.net', '') || 'unknown'
      }
    };
    console.log(`[whatsappService] Returning connected status:`, JSON.stringify(result));
    return result;
  }
  console.log(`[whatsappService] Returning disconnected status`);
  return { status: 'disconnected' };
};

const getQr = (adminId) => {
  const conn = connections.get(adminId);
  return conn ? conn.currentQr : null;
};

/**
 * disconnect(adminId) - admin-triggered disconnect
 */
const disconnect = async (adminId, { resetAuth = true } = {}) => {
  try {
    console.log(`[whatsappService] Admin ${adminId} disconnect called`, { resetAuth });
    const conn = connections.get(adminId);

    if (conn && conn.sock) {
      try { await conn.sock.logout(); } catch (e) { console.warn(`[whatsappService] Admin ${adminId} logout failed`, e && e.message); }
      try { conn.sock.ev.removeAllListeners(); } catch (e) { }
      try { conn.sock.end(); } catch (e) { }
    }

    connections.set(adminId, { isConnected: false, currentQr: null, initializing: false });
    emit('status', { status: 'disconnected' }, adminId);

    if (resetAuth) {
      try {
        const { WhatsappAuth } = require('../models');
        await WhatsappAuth.destroy({ where: { adminId } });
        console.log(`[whatsappService] Admin ${adminId} cleared auth from database`);
      } catch (e) {
        console.warn(`[whatsappService] Admin ${adminId} clearing auth failed`, e && e.message);
      }
      setTimeout(() => initWhatsApp(ioInstance, adminId), 1000);
    }

    return { ok: true };
  } catch (err) {
    console.error(`[whatsappService] Admin ${adminId} disconnect error`, err && err.message);
    return { ok: false, error: String(err) };
  }
};

const forceReinit = async (adminId) => {
  try {
    console.log(`[whatsappService] Admin ${adminId} forceReinit called`);

    const conn = connections.get(adminId);
    if (conn && conn.sock) {
      try { await conn.sock.logout(); } catch (e) { console.warn(`[whatsappService] Admin ${adminId} forceReinit logout failed`, e && e.message); }
      try { conn.sock.ev.removeAllListeners(); } catch (e) { }
      try { conn.sock.end(); } catch (e) { }
    }

    connections.set(adminId, { isConnected: false, currentQr: null, initializing: false });

    const { WhatsappAuth } = require('../models');
    await WhatsappAuth.destroy({ where: { adminId } });
    console.log(`[whatsappService] Admin ${adminId} cleared auth from database`);

    await new Promise(resolve => setTimeout(resolve, 500));
    await initWhatsApp(ioInstance, adminId);
  } catch (e) {
    console.warn(`[whatsappService] Admin ${adminId} forceReinit failed`, e && e.message);
  }
};

module.exports = {
  initWhatsApp,
  safeSendMessage,
  getStatus,
  getQr,
  disconnect,
  forceReinit,
  _sendMessageRaw
};
