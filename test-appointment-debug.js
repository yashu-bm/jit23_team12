const axios = require('axios');

async function test() {
  try {
    console.log('Logging in as client...');
    const clientLogin = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'client@example.com', // assuming this exists, or we register one
      password: 'password'
    }).catch(e => {
        return axios.post('http://localhost:8080/api/auth/register', {
            firstName: 'Test',
            lastName: 'Client',
            email: 'client_test@example.com',
            password: 'password',
            role: 'CLIENT'
        }).then(() => axios.post('http://localhost:8080/api/auth/login', {
            email: 'client_test@example.com',
            password: 'password'
        }));
    });
    const clientToken = clientLogin.data.accessToken;
    const clientId = clientLogin.data.id;
    console.log('Client token:', clientToken.substring(0, 20) + '...');

    console.log('Logging in as lawyer...');
    const lawyerLogin = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'lawyer@example.com', // assuming this exists, or we register one
      password: 'password'
    }).catch(e => {
        return axios.post('http://localhost:8080/api/auth/register', {
            firstName: 'Test',
            lastName: 'Lawyer',
            email: 'lawyer_test@example.com',
            password: 'password',
            role: 'LAWYER'
        }).then(() => axios.post('http://localhost:8080/api/auth/login', {
            email: 'lawyer_test@example.com',
            password: 'password'
        }));
    });
    const lawyerToken = lawyerLogin.data.accessToken;
    const lawyerId = lawyerLogin.data.id;
    console.log('Lawyer token:', lawyerToken.substring(0, 20) + '...');
    
    // Create an appointment
    console.log('Booking appointment...');
    const bookRes = await axios.post('http://localhost:8080/api/appointments/book', {
        userId: clientId,
        lawyerId: lawyerId,
        appointmentDate: new Date(Date.now() + 86400000).toISOString()
    }, { headers: { Authorization: `Bearer ${clientToken}` } });
    console.log('Book Response:', bookRes.data);

    // Fetch lawyer appointments
    console.log(`Fetching lawyer appointments for lawyerId: ${lawyerId}...`);
    const lawyerApts = await axios.get(`http://localhost:8080/api/appointments/lawyer/${lawyerId}`, {
        headers: { Authorization: `Bearer ${lawyerToken}` }
    });
    console.log('Lawyer Appointments:', lawyerApts.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

test();
