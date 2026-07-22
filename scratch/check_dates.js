const postgres = require('postgres');

async function checkCreationDates() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Creation dates for cards near 235:');
    const res = await sql`
      SELECT id, name, card_number, created_at 
      FROM participants 
      WHERE card_number IN ('232', '233', '234', '235', '236', '237')
      ORDER BY card_number;
    `;
    console.table(res.map(r => ({
        id: r.id,
        name: r.name,
        card: r.card_number,
        created: r.created_at.toISOString()
    })));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkCreationDates();
