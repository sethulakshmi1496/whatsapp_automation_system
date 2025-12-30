// backend/src/services/tellMeApiService.js
/**
 * Tell Me API Service
 * Handles external API notifications when new customers are created
 */

const axios = require('axios');

/**
 * Check if Tell Me API is enabled
 * @returns {boolean}
 */
function isEnabled() {
  return process.env.TELLME_API_ENABLED === 'true';
}

/**
 * Validate API configuration
 * @returns {object} { valid: boolean, message?: string }
 */
function validateConfig() {
  if (!process.env.TELLME_API_URL) {
    return { valid: false, message: 'TELLME_API_URL not configured' };
  }
  if (!process.env.TELLME_API_KEY) {
    return { valid: false, message: 'TELLME_API_KEY not configured' };
  }
  // Allow HTTP for localhost/testing, require HTTPS for production
  const url = process.env.TELLME_API_URL;
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  if (!isLocalhost && !url.startsWith('https://')) {
    return { valid: false, message: 'TELLME_API_URL must use HTTPS in production' };
  }
  return { valid: true };
}

/**
 * Format customer data for API request
 * @param {object} data - Customer data
 * @returns {object} Formatted payload
 */
function formatCustomerData(data) {
  return {
    customerName: data.customerName || 'Unknown',
    phoneNumber: data.phoneNumber,
    message: data.message || '',
    timestamp: data.timestamp || new Date().toISOString(),
    source: 'whatsapp_automation_system',
    adminId: data.adminId
  };
}

/**
 * Call Tell Me API with customer data
 * @param {object} customerData - Customer information
 * @returns {Promise<object>} { success: boolean, response?, error? }
 */
async function callTellMeApi(customerData) {
  // Check if enabled
  if (!isEnabled()) {
    console.log('[TellMeAPI] API is disabled (TELLME_API_ENABLED=false)');
    return { success: false, reason: 'disabled' };
  }

  // Validate configuration
  const configCheck = validateConfig();
  if (!configCheck.valid) {
    console.error('[TellMeAPI] Configuration error:', configCheck.message);
    return { success: false, reason: 'config_error', error: configCheck.message };
  }

  const apiUrl = process.env.TELLME_API_URL;
  const apiKey = process.env.TELLME_API_KEY;
  const timeout = parseInt(process.env.TELLME_API_TIMEOUT || '5000');
  const retryAttempts = parseInt(process.env.TELLME_API_RETRY_ATTEMPTS || '2');

  console.log('[TellMeAPI] Calling API for customer:', {
    name: customerData.customerName,
    phone: customerData.phoneNumber?.slice(-4)
  });

  const startTime = Date.now();
  let lastError = null;

  // Retry logic
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const payload = formatCustomerData(customerData);

      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: timeout
      });

      const duration = Date.now() - startTime;

      console.log(`[TellMeAPI] ✅ API call successful (${duration}ms, attempt ${attempt}):`, {
        status: response.status,
        data: response.data
      });

      // Log to database (optional)
      await logApiCall({
        ...customerData,
        success: true,
        responseStatus: response.status,
        responseBody: response.data,
        duration,
        attemptNumber: attempt
      });

      // ========== GOOGLE CONTACTS INTEGRATION START ==========
      // Add customer to Google Contacts after successful API call
      try {
        const googleContactsService = require('./googleContactsService');

        if (googleContactsService.isEnabled()) {
          console.log('[TellMeAPI] Calling Google Contacts service...');

          // Call Google Contacts service (non-blocking, fire-and-forget)
          googleContactsService.addContact(
            customerData.customerName,
            customerData.phoneNumber,
            customerData.adminId
          ).catch(err => {
            // Log error but don't throw - never break the flow
            console.error('[TellMeAPI] Google Contacts call failed:', err.message);
          });
        }
      } catch (googleError) {
        // Catch any errors to prevent flow disruption
        console.error('[TellMeAPI] Google Contacts integration error:', googleError.message);
      }
      // ========== GOOGLE CONTACTS INTEGRATION END ==========

      return {
        success: true,
        response: response.data,
        duration,
        attempt
      };

    } catch (error) {
      lastError = error;
      const duration = Date.now() - startTime;

      console.error(`[TellMeAPI] ❌ API call failed (attempt ${attempt}/${retryAttempts}):`, {
        error: error.message,
        code: error.code,
        status: error.response?.status
      });

      // Don't retry on 4xx errors (client errors)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        console.log('[TellMeAPI] Client error (4xx), not retrying');
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < retryAttempts) {
        const waitTime = 1000 * attempt; // 1s, 2s, 3s...
        console.log(`[TellMeAPI] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // All attempts failed
  const duration = Date.now() - startTime;
  const errorMessage = lastError?.message || 'Unknown error';

  console.error('[TellMeAPI] ❌ All retry attempts failed:', errorMessage);

  // Log to database (optional)
  await logApiCall({
    ...customerData,
    success: false,
    errorMessage,
    responseStatus: lastError?.response?.status,
    duration,
    attemptNumber: retryAttempts
  });

  return {
    success: false,
    error: errorMessage,
    duration
  };
}

/**
 * Log API call to database (optional)
 * @param {object} data - Log data
 */
async function logApiCall(data) {
  try {
    // Only log if model exists
    const models = require('../models');
    const TellMeApiLog = models.TellMeApiLog;

    if (!TellMeApiLog) {
      console.log('[TellMeAPI] TellMeApiLog model not found, skipping database log');
      return;
    }

    await TellMeApiLog.create({
      adminId: data.adminId,
      customerName: data.customerName,
      phoneNumber: data.phoneNumber,
      message: data.message,
      apiUrl: process.env.TELLME_API_URL,
      requestPayload: formatCustomerData(data),
      responseStatus: data.responseStatus,
      responseBody: data.responseBody,
      success: data.success,
      errorMessage: data.errorMessage,
      attemptNumber: data.attemptNumber,
      duration: data.duration
    });

    console.log('[TellMeAPI] Logged API call to database');

  } catch (err) {
    // Don't throw - logging failure shouldn't break the flow
    console.error('[TellMeAPI] Failed to log API call to database:', err.message);
  }
}

module.exports = {
  isEnabled,
  validateConfig,
  callTellMeApi,
  formatCustomerData
};
