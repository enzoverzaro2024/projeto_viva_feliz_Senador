import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const conn = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
const sql = postgres(conn, { ssl: "require" });

async function diagnose() {
  try {
    console.log("Testing exact insert of card 203...");
    const res = await sql`
      INSERT INTO participants (user_id, name, email, phone, card_id, card_number, current_balance)
      VALUES (1, '', 'cartao203-91c7@evento.local', '---', 'EC-203-6AFB53', '203', '0')
      RETURNING id, card_number;
    `;
    console.log("SUCCESS INSERTED:", res);
  } catch (err: any) {
    console.error("DIAGNOSE CAUGHT ERROR:");
    console.error("  message:", err.message);
    console.error("  detail:", err.detail);
    console.error("  constraint_name:", err.constraint_name);
    console.error("  column_name:", err.column_name);
    console.error("  table_name:", err.table_name);
    console.error("  code:", err.code);
  }

  // Also check if card 203 already exists
  const existing203 = await sql`SELECT id, card_number, email FROM participants WHERE card_number = '203' OR email LIKE 'cartao203%'`;
  console.log("Existing 203 check:", existing203);

  await sql.end();
  process.exit(0);
}

diagnose().catch(console.error);
