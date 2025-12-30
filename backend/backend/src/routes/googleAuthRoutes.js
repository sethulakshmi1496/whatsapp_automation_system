// backend/src/routes/googleAuthRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const googleContactsService = require('../services/googleContactsService');

/**
 * GET /auth/google
 * Initiate Google OAuth flow (requires login)
 */
router.get('/google', authMiddleware, (req, res) => {
  try {
    const adminId = req.user.id;

    // Generate authorization URL
    const authUrl = googleContactsService.getAuthorizationUrl(adminId);

    // Redirect to Google OAuth
    res.redirect(authUrl);
  } catch (err) {
    console.error('[GoogleAuth] Error initiating OAuth:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /auth/google/connect?adminId=X
 * Direct Google OAuth link (for testing/manual connection)
 */
router.get('/google/connect', (req, res) => {
  try {
    const adminId = req.query.adminId;

    if (!adminId) {
      return res.status(400).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>❌ Admin ID Required</h1>
            <p>Please provide adminId in the URL</p>
            <p>Example: <code>http://localhost:3000/auth/google/connect?adminId=4</code></p>
          </body>
        </html>
      `);
    }

    // Generate authorization URL
    const authUrl = googleContactsService.getAuthorizationUrl(parseInt(adminId));

    // Redirect to Google OAuth
    res.redirect(authUrl);
  } catch (err) {
    console.error('[GoogleAuth] Error initiating OAuth:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code not provided');
    }

    const adminId = parseInt(state);

    if (!adminId) {
      return res.status(400).send('Admin ID not provided');
    }

    // Exchange code for tokens and store
    const result = await googleContactsService.handleOAuthCallback(code, adminId);

    if (result.success) {
      // Redirect to frontend with success message
      res.send(`
        <html>
          <head>
            <title>Google Contacts Connected</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
              }
              h1 {
                color: #4CAF50;
                margin-bottom: 20px;
              }
              p {
                color: #666;
                line-height: 1.6;
              }
              .success-icon {
                font-size: 60px;
                margin-bottom: 20px;
              }
              button {
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 20px;
              }
              button:hover {
                background: #5568d3;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✅</div>
              <h1>Google Contacts Connected!</h1>
              <p>Your Google account has been successfully connected.</p>
              <p>New WhatsApp customers will now be automatically added to your Google Contacts.</p>
              <button onclick="window.close()">Close Window</button>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(500).send(`
        <html>
          <head>
            <title>Connection Failed</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
              }
              h1 {
                color: #f44336;
                margin-bottom: 20px;
              }
              p {
                color: #666;
                line-height: 1.6;
              }
              .error-icon {
                font-size: 60px;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">❌</div>
              <h1>Connection Failed</h1>
              <p>Failed to connect Google account: ${result.error}</p>
              <p>Please try again or contact support.</p>
            </div>
          </body>
        </html>
      `);
    }
  } catch (err) {
    console.error('[GoogleAuth] Callback error:', err.message);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET /auth/google/status
 * Check if admin has connected Google account
 */
router.get('/google/status', authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;

    const credentials = await googleContactsService.getAdminCredentials(adminId);

    res.json({
      ok: true,
      connected: !!credentials,
      enabled: googleContactsService.isEnabled()
    });
  } catch (err) {
    console.error('[GoogleAuth] Status check error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * DELETE /auth/google/disconnect
 * Disconnect Google account
 */
router.delete('/google/disconnect', authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;

    const { GoogleAuth } = require('../models');
    await GoogleAuth.destroy({ where: { adminId } });

    res.json({ ok: true, message: 'Google account disconnected' });
  } catch (err) {
    console.error('[GoogleAuth] Disconnect error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
