const postgres = require('postgres');

async function checkCardIdPattern() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Searching for card_id starting with EC-235-...');
    const res = await sql`
      SELECT id, name, email, card_id, card_number 
      FROM participants 
      WHERE card_id LIKE 'EC-235-%';
    `;
    console.log('Results:', res);

    if (res.length === 0) {
        console.log('Searching for any record containing 235 in card_id (case insensitive)...');
        const res2 = await sql`SELECT id, name, card_id, card_number FROM participants WHERE card_id ILIKE '%235%'`;
        console.log('Results:', res2);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkCardIdPattern();
