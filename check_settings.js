const postgres = require('postgres');

async function test() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    const res = await sql`SELECT att_points FROM event_settings`;
    console.log('att_points:', res);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
