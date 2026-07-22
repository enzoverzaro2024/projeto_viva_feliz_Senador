const postgres = require('postgres');

async function check178() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", {
    ssl: "require",
  });

  try {
    const res = await sql`
      SELECT id, name, email, card_id, card_number, current_balance, created_at 
      FROM participants 
      WHERE email LIKE '%178%' 
         OR card_number = '178' 
         OR card_number LIKE '%178%'
         OR card_id = '178' 
         OR card_id LIKE '%178%'
         OR name LIKE '%178%'
         OR name ILIKE '%178%'
         OR cast(id as text) = '178'
      ORDER BY id DESC;
    `;
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

check178();
