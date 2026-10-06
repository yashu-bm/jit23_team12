const mysql = require('mysql2/promise');

async function checkDb() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Root@123',
    database: 'smart_legal_db'
  });
  
  const [appointments] = await connection.execute('SELECT * FROM appointments');
  console.log('Appointments:', appointments);
  
  const [lawyers] = await connection.execute('SELECT user_id, is_approved FROM lawyer_profiles');
  console.log('Lawyers:', lawyers);
  
  const [users] = await connection.execute('SELECT id, email, role FROM users');
  console.log('Users:', users);

  await connection.end();
}

checkDb().catch(console.error);
