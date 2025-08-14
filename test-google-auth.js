// Simple test script to verify Google OAuth endpoint
const fetch = require('node-fetch');

async function testGoogleAuth() {
  try {
    // Test with a dummy token (this will fail but should show the endpoint is working)
    const response = await fetch('http://localhost:3000/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: 'dummy-token-for-testing'
      }),
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));

    if (result.error && result.error.code === 'GOOGLE_AUTH_ERROR') {
      console.log('✅ Google OAuth endpoint is working (expected error with dummy token)');
    } else {
      console.log('❌ Unexpected response');
    }
  } catch (error) {
    console.error('❌ Error testing Google OAuth:', error.message);
  }
}

testGoogleAuth();