const postgres = require('postgres');

async function checkCard235() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Searching for Card 235...');
    const res = await sql`
      SELECT id, name, email, card_id, card_number, current_balance 
      FROM participants 
      WHERE card_number = '235' 
         OR card_id = '235' 
         OR card_id LIKE '%235%'
         OR email LIKE '%235%'
         OR name LIKE '%235%';
    `;
    
    if (res.length === 0) {
      console.log('No participant found with Card 235 related information.');
      
      // also check for "0235" just in case it was padded differently
      const res2 = await sql`SELECT id, name, card_number FROM participants WHERE card_number = '0235' OR card_number LIKE '%235%'`;
      if (res2.length > 0) {
        console.log('Found something with %235%:', res2);
      } else {
        console.log('Truly nothing found.');
      }
    } else {
      console.log('Found Participants:', res);
      
      for (const p of res) {
         console.log(`\n--- Participant ${p.id} ---`);
         const att = await sql`SELECT id, date, description FROM attendance WHERE participant_id = ${p.id} ORDER BY date DESC LIMIT 5`;
         console.log('Attendance:', att);
         
         const trans = await sql`SELECT id, amount, description, created_at FROM transactions WHERE participant_id = ${p.id} ORDER BY created_at DESC LIMIT 5`;
         console.log('Transactions:', trans);
      }
    }
  } catch (err) {
    console.error('Error during database check:', err);
  } finally {
    process.exit(0);
  }
}

checkCard235();
