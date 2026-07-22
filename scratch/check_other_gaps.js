const postgres = require('postgres');

async function checkOtherGaps() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Checking gaps for 135 and 178...');
    
    // Near 135
    const res135 = await sql`
        SELECT id, name, card_number FROM participants 
        WHERE (card_number::integer >= 130 AND card_number::integer <= 140)
           OR id BETWEEN 270 AND 300
        ORDER BY id;
    `;
    console.log('Near 135/IDs 270-300:');
    console.table(res135);

    // Near 178
    const res178 = await sql`
        SELECT id, name, card_number FROM participants 
        WHERE (card_number::integer >= 170 AND card_number::integer <= 185)
           OR id BETWEEN 330 AND 360
        ORDER BY id;
    `;
    console.log('Near 178/IDs 330-360:');
    console.table(res178);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkOtherGaps();
