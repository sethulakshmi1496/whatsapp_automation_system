// Test API Server for Tell Me API Integration
// This simulates the external "Tell Me API" for testing purposes

const express = require('express');
const app = express();

app.use(express.json());

// Store received calls for inspection
const receivedCalls = [];

// Main endpoint that receives customer notifications
app.post('/customer/notify', (req, res) => {
    const timestamp = new Date().toISOString();

    console.log('\n' + '='.repeat(60));
    console.log('📩 TELL ME API - New Customer Notification Received');
    console.log('='.repeat(60));
    console.log('⏰ Time:', timestamp);
    console.log('📋 Request Body:');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('='.repeat(60) + '\n');

    // Store the call
    receivedCalls.push({
        timestamp,
        data: req.body
    });

    // Simulate successful response
    res.status(200).json({
        success: true,
        message: 'Customer notification received successfully',
        referenceId: 'REF-' + Date.now(),
        timestamp: timestamp
    });
});

// Endpoint to view all received calls
app.get('/calls', (req, res) => {
    res.json({
        total: receivedCalls.length,
        calls: receivedCalls
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Test API server is running',
        totalCallsReceived: receivedCalls.length
    });
});

// Start server
const PORT = 4000;
app.listen(PORT, () => {
    console.log('\n' + '🧪'.repeat(30));
    console.log('🚀 Tell Me API Test Server Started');
    console.log('🧪'.repeat(30));
    console.log(`\n📍 Server running on: http://localhost:${PORT}`);
    console.log(`\n📌 Endpoints:`);
    console.log(`   POST http://localhost:${PORT}/customer/notify - Receive notifications`);
    console.log(`   GET  http://localhost:${PORT}/calls - View all received calls`);
    console.log(`   GET  http://localhost:${PORT}/health - Health check`);
    console.log(`\n⏳ Waiting for Tell Me API calls...\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n📊 Summary:');
    console.log(`   Total calls received: ${receivedCalls.length}`);
    console.log('\n👋 Test API server shutting down...\n');
    process.exit(0);
});
