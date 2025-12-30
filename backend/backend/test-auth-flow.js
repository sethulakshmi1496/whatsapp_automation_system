const axios = require('axios');

async function testAuthFlow() {
    const baseUrl = 'http://localhost:3000';
    const email = 'admin@example.com';
    const password = 'admin123';

    try {
        console.log('1. Attempting Login...');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            email,
            password
        });

        if (loginRes.status === 200 && loginRes.data.token) {
            console.log('✅ Login Successful');
            const token = loginRes.data.token;
            console.log('Token:', token.substring(0, 20) + '...');

            console.log('\n2. Attempting to fetch Customers with Token...');
            try {
                const customerRes = await axios.get(`${baseUrl}/api/customers`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (customerRes.status === 200) {
                    console.log('✅ Fetch Customers Successful');
                    console.log('Customers found:', customerRes.data.customers.length);
                    console.log('First customer:', customerRes.data.customers[0]);
                } else {
                    console.log('❌ Fetch Customers Failed with status:', customerRes.status);
                }
            } catch (err) {
                console.error('❌ Fetch Customers Error:', err.response ? err.response.status : err.message);
                if (err.response) console.error('Data:', err.response.data);
            }

        } else {
            console.log('❌ Login Failed (No token returned)');
        }

    } catch (error) {
        console.error('❌ Login Error:', error.response ? error.response.status : error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
}

testAuthFlow();
