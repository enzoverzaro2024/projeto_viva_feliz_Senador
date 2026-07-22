const postgres = require('postgres');

async function test() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    const res = await sql`SELECT id, name, email, card_id, card_number, current_balance FROM participants WHERE email LIKE '%019%' OR card_number = '019' OR card_id = '019' OR card_id LIKE '%019%'`;
    console.log('Participants:', res);
    
    for (const p of res) {
       console.log(`\n--- Participant ${p.id} ---`);
       const att = await sql`SELECT id, date, description FROM attendance WHERE participant_id = ${p.id} ORDER BY date DESC LIMIT 10`;
       console.log('Attendance:', att);
       
       const trans = await sql`SELECT id, amount, description, created_at FROM transactions WHERE participant_id = ${p.id} ORDER BY created_at DESC LIMIT 10`;
       console.log('Transactions:', trans);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
