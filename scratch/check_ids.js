const postgres = require('postgres');

async function checkIds() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Checking participant with ID 237...');
    const res = await sql`SELECT id, name, card_number FROM participants WHERE id = 237`;
    console.log('ID 237:', res);

    console.log('\nChecking all cards near 235 in cardNumber sequence...');
    const resNearby = await sql`
      SELECT id, name, card_number 
      FROM participants 
      WHERE (card_number::integer >= 230 AND card_number::integer <= 240)
         OR card_number IN ('230', '231', '232', '233', '234', '235', '236', '237', '238', '239', '240')
      ORDER BY card_number;
    `;
    console.log('Nearby cards:', resNearby);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkIds();
