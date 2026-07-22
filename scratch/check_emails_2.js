const postgres = require('postgres');

async function checkEmails2() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Searching for emails: cartao233, cartao234, cartao235, cartao236...');
    const res = await sql`
      SELECT id, name, email, card_number 
      FROM participants 
      WHERE email IN ('cartao233@evento.local', 'cartao234@evento.local', 'cartao235@evento.local', 'cartao236@evento.local');
    `;
    console.log('Results:', res);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkEmails2();
