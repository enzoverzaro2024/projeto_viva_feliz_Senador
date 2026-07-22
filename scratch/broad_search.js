const postgres = require('postgres');

async function broadSearch() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Searching for any card number containing 235...');
    const res = await sql`
      SELECT id, name, email, card_id, card_number 
      FROM participants 
      WHERE card_number LIKE '%235%'
         OR card_id LIKE '%235%';
    `;
    console.log('Results for %235%:', res);

    console.log('\nSearching for card numbers near 235...');
    const resNear = await sql`
      SELECT id, name, card_number 
      FROM participants 
      WHERE card_number IN ('234', '235', '236', '0234', '0235', '0236')
      ORDER BY card_number;
    `;
    console.log('Nearby cards:', resNear);

    const count = await sql`SELECT count(*) FROM participants`;
    console.log('\nTotal participants:', count[0].count);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

broadSearch();
