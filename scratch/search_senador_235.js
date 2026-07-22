const postgres = require('postgres');

async function searchSenador235() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Searching SENADOR database for ANY trace of 235...');
    
    // 1. Broadest possible search in participants
    const parts = await sql`
        SELECT id, name, card_id, card_number, email 
        FROM participants 
        WHERE card_number ILIKE '%235%'
           OR card_id ILIKE '%235%'
           OR name ILIKE '%235%'
           OR email ILIKE '%235%'
    `;
    console.log('Participants matching 235:', parts);

    // 2. Search for any transaction with a "suspicious" ID
    // If ID 401 was 235, are there any transactions for ID 401? (I already checked, but let's check again for ALL possible deleted IDs near the gap)
    const tx = await sql`
        SELECT * FROM transactions 
        WHERE participant_id BETWEEN 400 AND 401 
    `;
    console.log('Transactions for IDs 400-401:', tx);

    // 3. Look for ANY transaction where the description might indicate a card number manually typed by a volunteer
    const volunteerNotes = await sql`
        SELECT t.*, p.name as p_name, p.card_number as p_card 
        FROM transactions t
        JOIN participants p ON t.participant_id = p.id
        WHERE t.description ILIKE '%235%'
    `;
    console.log('Transactions with 235 in description:', volunteerNotes);

    // 4. Look for ANY attendance with 235 in description
    const attendanceNotes = await sql`
        SELECT a.*, p.name as p_name, p.card_number as p_card 
        FROM attendance a
        JOIN participants p ON a.participant_id = p.id
        WHERE a.description ILIKE '%235%'
    `;
    console.log('Attendance with 235 in description:', attendanceNotes);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

searchSenador235();
