const postgres = require('postgres');

async function listTables() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    console.log('Listing all tables in the database...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    console.log('Tables:', tables);

    for (const t of tables) {
        console.log(`\n--- Count for ${t.table_name} ---`);
        const count = await sql`SELECT count(*) FROM ${sql(t.table_name)}`;
        console.log(count[0].count);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

listTables();
