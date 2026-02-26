
// const fetch = require('node-fetch'); // Not needed in Node 18+

async function testWebhook() {
  try {
    console.log("Sending test request to local webhook...");
    const response = await fetch('http://127.0.0.1:3000/api/payment/webhook/yoomoney', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        test_notification: 'true',
        notification_type: 'p2p-incoming',
        amount: '2.00',
        currency: '643',
        datetime: new Date().toISOString(),
        sender: '41001000040',
        codepro: 'false',
        label: 'test-label',
        sha1_hash: 'test-hash'
      })
    });

    console.log(`Response status: ${response.status}`);
    const text = await response.text();
    console.log(`Response body: ${text}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

testWebhook();
