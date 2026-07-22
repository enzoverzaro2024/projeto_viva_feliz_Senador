const postgres = require('postgres');

async function checkBatchTimeline() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Checking participants created between 20:54:30 and 20:54:40 on 2026-04-09...');
    const res = await sql`
      SELECT id, name, card_number, created_at 
      FROM participants 
      WHERE created_at >= '2026-04-09 20:54:30' AND created_at <= '2026-04-09 20:54:40'
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

checkBatchTimeline();
