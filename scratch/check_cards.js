const postgres = require('postgres');
async function run() {
  const sql = postgres("postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7.sa-east-1.aws.neon.tech/neondb?sslmode=require", { ssl: "require" });
  const res = await sql`SELECT id, name, email, card_number, card_id FROM participants WHERE email IN ('cartao178@evento.local', 'cartao234@evento.local', 'cartao012@evento.local') OR card_number IN ('178', '234', '012')`;
  console.log(JSON.stringify(res, null, 2));
  process.exit();
}
run();
