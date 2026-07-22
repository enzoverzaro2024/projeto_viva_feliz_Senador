const postgres = require('postgres');

async function checkOrphans() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Checking for orphaned transactions...');
    const result = await sql`
      SELECT t.id, t.participant_id, t.amount, t.description 
      FROM transactions t
      LEFT JOIN participants p ON t.participant_id = p.id
      WHERE p.id IS NULL;
    `;
    console.log('Orphaned transactions:', result);

    console.log('\nChecking for orphaned attendance...');
    const result2 = await sql`
      SELECT a.id, a.participant_id, a.description 
      FROM attendance a
      LEFT JOIN participants p ON a.participant_id = p.id
      WHERE p.id IS NULL;
    `;
    console.log('Orphaned attendance:', result2);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkOrphans();
