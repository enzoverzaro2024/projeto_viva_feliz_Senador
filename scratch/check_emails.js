const postgres = require('postgres');

async function checkEmails() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Searching for emails: cartao135, cartao178, cartao235...');
    const res = await sql`
      SELECT id, name, email, card_number 
      FROM participants 
      WHERE email IN ('cartao135@evento.local', 'cartao178@evento.local', 'cartao235@evento.local')
         OR email LIKE '%235%'
         OR email LIKE '%135%'
         OR email LIKE '%178%';
    `;
    console.log('Results:', res);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkEmails();
