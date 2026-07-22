const postgres = require('postgres');

async function listAllCards() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Listing all card numbers...');
    const res = await sql`
      SELECT id, name, card_number 
      FROM participants 
      WHERE card_number ~ '^[0-9]+$'
      ORDER BY card_number::integer;
    `;
    
    let prev = -1;
    let missing = [];
    for (const r of res) {
        const curr = parseInt(r.card_number);
        if (prev !== -1 && curr !== prev + 1) {
            for (let m = prev + 1; m < curr; m++) {
                missing.push(m);
            }
        }
        prev = curr;
    }
    
    console.log('Missing card numbers in sequence:', missing);
    
    // Check specific range 230-240
    console.log('\nRange 230-240:');
    console.table(res.filter(r => parseInt(r.card_number) >= 230 && parseInt(r.card_number) <= 240));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

listAllCards();
