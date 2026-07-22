const postgres = require('postgres');

async function checkDeadIds() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Checking transactions for participant IDs 400 and 401 (even if participants are gone)...');
    
    const tx = await sql`SELECT * FROM transactions WHERE participant_id IN (400, 401) ORDER BY created_at`;
    console.log('Transactions for 400/401:', tx);

    const att = await sql`SELECT * FROM attendance WHERE participant_id IN (400, 401) ORDER BY date`;
    console.log('Attendance for 400/401:', att);

    console.log('\nChecking if there are any transactions that "look like" they were for card 235...');
    // Maybe someone manually added points and the description has a name or something.
    const suspectTx = await sql`
        SELECT t.*, p.name as current_participant_name 
        FROM transactions t 
        LEFT JOIN participants p ON t.participant_id = p.id 
        WHERE t.description ILIKE '%235%'
           OR t.description ILIKE '%duzentos e trinta e cinco%'
    `;
    console.log('Suspect Transactions:', suspectTx);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkDeadIds();
