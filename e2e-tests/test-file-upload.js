const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://127.0.0.1:8080/api';

async function runUploadVerification() {
  console.log('--- Starting File Upload E2E Verification ---');
  let clientToken, lawyerToken;
  let clientId, lawyerId;
  
  const clientEmail = `client_${Date.now()}@test.com`;

  try {
    // 1. Register Client
    console.log('Registering Client for Upload Test...');
    let res = await axios.post(`${BASE_URL}/auth/register`, {
      email: clientEmail,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Client',
      role: 'user'
    });
    
    // 2. Login Client
    res = await axios.post(`${BASE_URL}/auth/login`, {
      email: clientEmail,
      password: 'password123'
    });
    clientToken = res.data.token;
    console.log('Client logged in, token acquired.');

    // Create a dummy PDF file for testing
    const testFilePath = path.join(__dirname, 'test_attachment.pdf');
    fs.writeFileSync(testFilePath, 'Dummy PDF content for testing E2E upload feature.');
    
    // 3. Upload File as Client
    console.log('Testing File Upload API (/api/chat/upload)...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    
    res = await axios.post(`${BASE_URL}/chat/upload`, form, {
      headers: { 
        ...form.getHeaders(),
        Authorization: `Bearer ${clientToken}` 
      }
    });

    console.log('Upload Response Status:', res.status);
    console.log('Upload Response Body:', res.data);

    if (res.status === 200 && res.data.fileUrl && res.data.fileName) {
      console.log('✅ File upload API test passed successfully.');
    } else {
      throw new Error("Upload API did not return expected data.");
    }
    
    // Cleanup
    fs.unlinkSync(testFilePath);

    console.log('--- E2E File Upload Verification Completed Successfully ---');
  } catch (error) {
    console.error('API Verification FAILED:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

runUploadVerification();
