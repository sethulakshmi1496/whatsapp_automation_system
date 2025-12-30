// backend/src/services/googleContactsService.js
/**
 * Google Contacts Service
 * Automatically adds customers to admin's Google Contacts after successful Tell Me API call
 */

const { google } = require('googleapis');

/**
 * Check if Google Contacts integration is enabled
 * @returns {boolean}
 */
function isEnabled() {
    return process.env.GOOGLE_CONTACTS_ENABLED === 'true';
}

/**
 * Validate Google OAuth configuration
 * @returns {object} { valid: boolean, message?: string }
 */
function validateConfig() {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return { valid: false, message: 'GOOGLE_CLIENT_ID not configured' };
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
        return { valid: false, message: 'GOOGLE_CLIENT_SECRET not configured' };
    }
    if (!process.env.GOOGLE_REDIRECT_URI) {
        return { valid: false, message: 'GOOGLE_REDIRECT_URI not configured' };
    }
    return { valid: true };
}

/**
 * Get OAuth2 client
 * @returns {OAuth2Client}
 */
function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

/**
 * Get admin's Google credentials from database
 * @param {number} adminId
 * @returns {Promise<object|null>} { accessToken, refreshToken }
 */
async function getAdminCredentials(adminId) {
    try {
        const models = require('../models');
        const GoogleAuth = models.GoogleAuth;

        if (!GoogleAuth) {
            console.log('[GoogleContacts] GoogleAuth model not found');
            return null;
        }

        const auth = await GoogleAuth.findOne({ where: { adminId } });

        if (!auth) {
            console.log(`[GoogleContacts] No Google credentials found for admin ${adminId}`);
            return null;
        }

        // Check if token is expired
        const now = new Date();
        if (auth.expiresAt && new Date(auth.expiresAt) < now) {
            console.log(`[GoogleContacts] Token expired for admin ${adminId}, refreshing...`);
            return await refreshToken(adminId, auth.refreshToken);
        }

        return {
            accessToken: auth.accessToken,
            refreshToken: auth.refreshToken
        };
    } catch (err) {
        console.error('[GoogleContacts] Error getting admin credentials:', err.message);
        return null;
    }
}

/**
 * Refresh expired access token
 * @param {number} adminId
 * @param {string} refreshToken
 * @returns {Promise<object|null>}
 */
async function refreshToken(adminId, refreshToken) {
    try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update in database
        const models = require('../models');
        const GoogleAuth = models.GoogleAuth;

        await GoogleAuth.update({
            accessToken: credentials.access_token,
            expiresAt: new Date(credentials.expiry_date)
        }, {
            where: { adminId }
        });

        console.log(`[GoogleContacts] Token refreshed for admin ${adminId}`);

        return {
            accessToken: credentials.access_token,
            refreshToken: refreshToken
        };
    } catch (err) {
        console.error('[GoogleContacts] Error refreshing token:', err.message);
        return null;
    }
}

/**
 * Add contact to Google Contacts
 * @param {string} name - Customer name
 * @param {string} phone - Customer phone number
 * @param {number} adminId - Admin ID
 * @returns {Promise<object>} { success: boolean, contactId?, error? }
 */
async function addContact(name, phone, adminId) {
    // Check if enabled
    if (!isEnabled()) {
        console.log('[GoogleContacts] Google Contacts integration is disabled');
        return { success: false, reason: 'disabled' };
    }

    // Validate configuration
    const configCheck = validateConfig();
    if (!configCheck.valid) {
        console.error('[GoogleContacts] Configuration error:', configCheck.message);
        return { success: false, reason: 'config_error', error: configCheck.message };
    }

    console.log(`[GoogleContacts] Adding contact for admin ${adminId}: ${name} (${phone})`);

    const startTime = Date.now();

    try {
        // Get admin's Google credentials
        const credentials = await getAdminCredentials(adminId);

        if (!credentials) {
            console.log(`[GoogleContacts] No valid credentials for admin ${adminId}`);
            return { success: false, reason: 'no_credentials', error: 'Admin not authorized' };
        }

        // Setup OAuth2 client
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: credentials.accessToken,
            refresh_token: credentials.refreshToken
        });

        // Get People API
        const people = google.people({ version: 'v1', auth: oauth2Client });

        // Format phone number (ensure it has country code)
        let formattedPhone = phone;
        if (!phone.startsWith('+')) {
            formattedPhone = '+' + phone;
        }

        // Create contact
        const contact = {
            names: [{
                givenName: name,
                displayName: name
            }],
            phoneNumbers: [{
                value: formattedPhone,
                type: 'mobile'
            }]
        };

        // Add contact to Google
        const response = await people.people.createContact({
            requestBody: {
                ...contact
            }
        });

        const duration = Date.now() - startTime;
        const contactId = response.data.resourceName;

        console.log(`[GoogleContacts] ✅ Contact added successfully (${duration}ms):`, {
            name,
            phone: formattedPhone,
            contactId
        });

        // Log to database (optional)
        await logContactAddition({
            adminId,
            customerName: name,
            phoneNumber: phone,
            success: true,
            contactId,
            duration
        });

        return {
            success: true,
            contactId,
            duration
        };

    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error.message || 'Unknown error';

        console.error(`[GoogleContacts] ❌ Failed to add contact (${duration}ms):`, {
            name,
            phone,
            error: errorMessage,
            code: error.code
        });

        // Log to database (optional)
        await logContactAddition({
            adminId,
            customerName: name,
            phoneNumber: phone,
            success: false,
            errorMessage,
            duration
        });

        return {
            success: false,
            error: errorMessage,
            duration
        };
    }
}

/**
 * Log contact addition to database (optional)
 * @param {object} data - Log data
 */
async function logContactAddition(data) {
    try {
        const models = require('../models');
        const GoogleContactsLog = models.GoogleContactsLog;

        if (!GoogleContactsLog) {
            console.log('[GoogleContacts] GoogleContactsLog model not found, skipping database log');
            return;
        }

        await GoogleContactsLog.create({
            adminId: data.adminId,
            customerName: data.customerName,
            phoneNumber: data.phoneNumber,
            success: data.success,
            contactId: data.contactId,
            errorMessage: data.errorMessage,
            duration: data.duration
        });

        console.log('[GoogleContacts] Logged contact addition to database');

    } catch (err) {
        // Don't throw - logging failure shouldn't break the flow
        console.error('[GoogleContacts] Failed to log to database:', err.message);
    }
}

/**
 * Generate OAuth authorization URL
 * @param {number} adminId
 * @returns {string} Authorization URL
 */
function getAuthorizationUrl(adminId) {
    const oauth2Client = getOAuth2Client();

    const scopes = [
        'https://www.googleapis.com/auth/contacts'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: adminId.toString() // Pass adminId in state
    });

    return url;
}

/**
 * Handle OAuth callback and store tokens
 * @param {string} code - Authorization code
 * @param {number} adminId - Admin ID
 * @returns {Promise<object>} { success: boolean, error? }
 */
async function handleOAuthCallback(code, adminId) {
    try {
        const oauth2Client = getOAuth2Client();

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Store in database
        const models = require('../models');
        const GoogleAuth = models.GoogleAuth;

        if (!GoogleAuth) {
            return { success: false, error: 'GoogleAuth model not found' };
        }

        // Calculate expiry date
        const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

        // Upsert (update or insert)
        await GoogleAuth.upsert({
            adminId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt
        });

        console.log(`[GoogleContacts] OAuth tokens stored for admin ${adminId}`);

        return { success: true };

    } catch (err) {
        console.error('[GoogleContacts] OAuth callback error:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = {
    isEnabled,
    validateConfig,
    addContact,
    getAuthorizationUrl,
    handleOAuthCallback,
    getAdminCredentials
};
