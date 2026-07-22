const postgres = require('postgres');

async function checkIdsNear() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Checking participants with IDs between 390 and 410...');
    const res = await sql`
      SELECT id, name, card_number, created_at 
      FROM participants 
      WHERE id >= 390 AND id <= 410
      ORDER BY id;
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

checkIdsNear();
