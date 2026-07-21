async function test() {
  try {
    console.log('Logging in as client...');
    let clientLogin = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'client@example.com', password: 'password' })
    });
    
    if (!clientLogin.ok) {
        await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: 'Test', lastName: 'Client', email: 'client@example.com', password: 'password', role: 'CLIENT' })
        });
        clientLogin = await fetch('http://localhost:8080/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'client@example.com', password: 'password' })
        });
    }
    
    const clientData = await clientLogin.json();
    const clientToken = clientData.accessToken;
    const clientId = clientData.id;
    console.log('Client ID:', clientId);

    console.log('Logging in as lawyer...');
    let lawyerLogin = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lawyer@example.com', password: 'password' })
    });
    
    if (!lawyerLogin.ok) {
        await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: 'Test', lastName: 'Lawyer', email: 'lawyer@example.com', password: 'password', role: 'LAWYER' })
        });
        
        // Wait, for lawyer we also need an approved lawyer profile? 
        // We'll see if the existing lawyers work first. Let's just use user ID 2 directly for a known lawyer!
    }
    
    const lawyerData = await lawyerLogin.json();
    const lawyerToken = lawyerData.accessToken;
    const lawyerId = lawyerData.id;
    console.log('Lawyer ID:', lawyerId);
    
    console.log('Booking appointment...');
    const bookRes = await fetch('http://localhost:8080/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clientToken}` },
        body: JSON.stringify({
            userId: clientId,
            lawyerId: lawyerId,
            appointmentDate: new Date(Date.now() + 86400000).toISOString()
        })
    });
    console.log('Book Status:', bookRes.status);
    console.log('Book Response:', await bookRes.text());

    console.log(`Fetching lawyer appointments for lawyerId: ${lawyerId}...`);
    const lawyerApts = await fetch(`http://localhost:8080/api/appointments/lawyer/${lawyerId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${lawyerToken}` }
    });
    console.log('Lawyer Appointments Status:', lawyerApts.status);
    console.log('Lawyer Appointments Response:', await lawyerApts.text());
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
