const postgres = require('postgres');

async function checkDeeply() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Searching transactions for "235"...');
    const tx = await sql`SELECT * FROM transactions WHERE description LIKE '%235%'`;
    console.log('Transactions:', tx);

    console.log('\nSearching attendance for "235"...');
    const att = await sql`SELECT * FROM attendance WHERE description LIKE '%235%'`;
    console.log('Attendance:', att);

    console.log('\nSearching for participants where card_id or name or email has 235 (again, but broader)...');
    const parts = await sql`
        SELECT * FROM participants 
        WHERE card_id LIKE '%235%' 
           OR name LIKE '%235%' 
           OR email LIKE '%235%'
           OR card_number LIKE '%235%'
    `;
    console.log('Participants:', parts);

    console.log('\nChecking if there is any gap in serial IDs...');
    // If we have 234 and 236 in card_number, let's see their IDs again.
    // Near cards: Result(10) [
    //  { id: 344, name: 'Arthur Medeiros ', card_number: '234' },
    //  { id: 402, name: 'Francisca Vieira', card_number: '236' },
    // ]
    // There's a big gap in IDs (344 to 402). What are the IDs in between?
    const inBetween = await sql`SELECT id, name, card_number FROM participants WHERE id > 344 AND id < 402 ORDER BY id`;
    console.log('Participants with IDs between 344 and 402:', inBetween);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkDeeply();
