const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:8080/api';

async function runApiVerification() {
  console.log('--- Starting API Verification ---');
  let clientToken, lawyerToken;
  let clientId, lawyerId;
  
  const clientEmail = `client_${Date.now()}@test.com`;
  const lawyerEmail = `lawyer_${Date.now()}@test.com`;

  try {
    // 1. Register Client
    console.log('Registering Client...');
    await axios.post(`${BASE_URL}/auth/register`, {
      email: clientEmail,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Client',
      role: 'user'
    });
    console.log('Client registered successfully.');

    // 2. Register Lawyer
    console.log('Registering Lawyer...');
    await axios.post(`${BASE_URL}/auth/register`, {
      email: lawyerEmail,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Lawyer',
      role: 'lawyer'
    });
    console.log('Lawyer registered successfully.');

    // 3. Login Client
    console.log('Logging in Client...');
    let res = await axios.post(`${BASE_URL}/auth/login`, {
      email: clientEmail,
      password: 'password123'
    });
    clientToken = res.data.token;
    clientId = res.data.id;
    console.log('Client logged in.');

    // 4. Login Lawyer
    console.log('Logging in Lawyer...');
    res = await axios.post(`${BASE_URL}/auth/login`, {
      email: lawyerEmail,
      password: 'password123'
    });
    lawyerToken = res.data.token;
    lawyerId = res.data.id;
    console.log('Lawyer logged in.');

    // 5. Client Books Appointment
    console.log('Client booking appointment...');
    res = await axios.post(`${BASE_URL}/appointments/book`, {
      lawyerId: lawyerId,
      userId: clientId,
      appointmentDate: new Date(Date.now() + 86400000).toISOString().slice(0, 19),
      durationMinutes: 60,
      notes: "Test consultation",
      meetingType: "ONLINE"
    }, { headers: { Authorization: `Bearer ${clientToken}` } });
    const appointmentId = res.data.id;
    console.log(`Appointment ${appointmentId} booked successfully.`);

    // 6. Lawyer Accepts Appointment
    console.log('Lawyer accepting appointment...');
    res = await axios.put(`${BASE_URL}/appointments/${appointmentId}/status`, {
      status: 'CONFIRMED'
    }, { headers: { Authorization: `Bearer ${lawyerToken}` } });
    console.log('Appointment CONFIRMED.');

    // 7. Client Pays for Appointment
    console.log('Client paying for appointment...');
    res = await axios.post(`${BASE_URL}/payments/create-order`, {
      userId: clientId,
      appointmentId: appointmentId,
      amount: 1000
    }, { headers: { Authorization: `Bearer ${clientToken}` } });
    const orderId = res.data.id;
    const razorpayOrderId = res.data.razorpayOrderId || "order_test_123";

    res = await axios.post(`${BASE_URL}/payments/verify`, {
      razorpayOrderId: razorpayOrderId,
      razorpayPaymentId: "pay_test_" + Date.now(),
      razorpaySignature: "test_signature",
      appointmentId: appointmentId
    }, { headers: { Authorization: `Bearer ${clientToken}` } });
    console.log('Payment successful.');

    // 8. Fetch Conversations (Client)
    console.log('Fetching Client Conversations...');
    res = await axios.get(`${BASE_URL}/chat/conversations`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    if (res.data.length === 0) throw new Error("Client conversation list is empty!");
    const sessionId = res.data[0].id;
    console.log(`Conversation retrieved successfully (Session ID: ${sessionId}).`);

    // 9. Fetch Notifications
    console.log('Fetching Client Notifications...');
    res = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    console.log(`Client has ${res.data.length} notifications.`);
    if (res.data.length === 0) throw new Error("Expected notifications but got 0.");

    console.log('--- API Verification Completed Successfully ---');
  } catch (error) {
    console.error('API Verification FAILED:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

runApiVerification();
