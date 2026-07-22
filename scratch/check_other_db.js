const postgres = require('postgres');

async function checkOtherDB() {
  const sql = postgres("postgresql://neondb_owner:npg_B73WcuedJKiC@ep-young-bread-amnzn699-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Searching for Card 235 in the EVENTCARD database...');
    const result = await sql`
      SELECT id, name, card_number, current_balance, created_at 
      FROM participants 
      WHERE card_number = '235' OR card_number = '0235' OR name LIKE '%235%'
    `;
    console.log('Participants:', result);

    if (result.length > 0) {
        for (const p of result) {
            console.log(`\n--- History for Participant ${p.id} (${p.name}) ---`);
            const trans = await sql`SELECT * FROM transactions WHERE participant_id = ${p.id} ORDER BY created_at`;
            console.log('Transactions:', trans);
            const att = await sql`SELECT * FROM attendance WHERE participant_id = ${p.id} ORDER BY date`;
            console.log('Attendance:', att);
        }
    } else {
        console.log('Not found in participants table. Checking any descriptive mention in transactions...');
        const trans = await sql`SELECT * FROM transactions WHERE description LIKE '%235%'`;
        console.log('Transactions mentioning 235:', trans);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkOtherDB();
