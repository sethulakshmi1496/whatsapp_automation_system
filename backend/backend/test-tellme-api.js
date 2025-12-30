// Quick test script to verify Tell Me API service works
const tellMeService = require('./src/services/tellMeApiService');

console.log('='.repeat(60));
console.log('🧪 Testing Tell Me API Service');
console.log('='.repeat(60));
console.log('');

// Set environment variables for testing
process.env.TELLME_API_ENABLED = 'true';
process.env.TELLME_API_URL = 'http://localhost:4000/customer/notify';
process.env.TELLME_API_KEY = 'test_key_123';
process.env.TELLME_API_TIMEOUT = '5000';
process.env.TELLME_API_RETRY_ATTEMPTS = '2';

console.log('📋 Configuration:');
console.log('   ENABLED:', process.env.TELLME_API_ENABLED);
console.log('   URL:', process.env.TELLME_API_URL);
console.log('   KEY:', process.env.TELLME_API_KEY);
console.log('');

// Test data
const testData = {
    customerName: 'John Doe',
    phoneNumber: '919876543210',
    message: 'Hello, I need help with my order',
    adminId: 1,
    timestamp: new Date()
};

console.log('📤 Sending test API call...');
console.log('   Customer:', testData.customerName);
console.log('   Phone:', testData.phoneNumber);
console.log('   Message:', testData.message);
console.log('');

// Call the API
tellMeService.callTellMeApi(testData)
    .then(result => {
        console.log('='.repeat(60));
        if (result.success) {
            console.log('✅ SUCCESS! API call worked perfectly!');
            console.log('='.repeat(60));
            console.log('');
            console.log('📊 Response Details:');
            console.log('   Duration:', result.duration + 'ms');
            console.log('   Attempt:', result.attempt);
            console.log('   Response:', JSON.stringify(result.response, null, 2));
            console.log('');
            console.log('🎉 Tell Me API integration is WORKING!');
        } else {
            console.log('❌ FAILED! API call did not work');
            console.log('='.repeat(60));
            console.log('');
            console.log('📊 Error Details:');
            console.log('   Reason:', result.reason || result.error);
            console.log('');
            console.log('💡 Make sure test server is running: node test-api-server.js');
        }
        console.log('');
        console.log('='.repeat(60));
        process.exit(0);
    })
    .catch(err => {
        console.log('❌ ERROR:', err.message);
        console.log('');
        console.log('💡 Make sure test server is running: node test-api-server.js');
        process.exit(1);
    });
