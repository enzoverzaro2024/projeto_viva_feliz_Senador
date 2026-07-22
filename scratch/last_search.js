const postgres = require('postgres');

async function lastSearch() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Final broad search for "235" in Senador...');
    const res = await sql`
        SELECT id, name, card_number 
        FROM participants 
        WHERE name ILIKE '%235%' 
           OR card_number ILIKE '%235%'
           OR email ILIKE '%235%'
    `;
    console.log('Results:', res);

    // Also check for any participant with NO card number but a name that might be related
    const res2 = await sql`SELECT id, name, card_number FROM participants WHERE card_number IS NULL OR card_number = ''`;
    console.log('Participants without card number:', res2.length);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

lastSearch();
