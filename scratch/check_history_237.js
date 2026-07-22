const postgres = require('postgres');

async function checkHistory() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Checking Transaction and Attendance history for ID 237 (which was card 235 in March)...');
    
    const p = await sql`SELECT id, name, card_number, email, created_at FROM participants WHERE id = 237`;
    console.log('Current Participant 237:', p);

    const trans = await sql`SELECT * FROM transactions WHERE participant_id = 237 ORDER BY created_at`;
    console.log('\nTransactions for ID 237:', trans);

    const att = await sql`SELECT * FROM attendance WHERE participant_id = 237 ORDER BY date`;
    console.log('\nAttendance for ID 237:', att);

    console.log('\n--- Searching for ANY record mentioning "235" ---');
    const allTrans = await sql`SELECT * FROM transactions WHERE description LIKE '%235%'`;
    console.log('Transactions mentioning 235:', allTrans);

    const allAtt = await sql`SELECT * FROM attendance WHERE description LIKE '%235%'`;
    console.log('Attendance mentioning 235:', allAtt);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkHistory();
