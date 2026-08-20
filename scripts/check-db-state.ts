import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const conn = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

async function check() {
  const sql = postgres(conn, { ssl: "require" });
  const count = await sql`SELECT COUNT(*) as total FROM participants`;
  const highCards = await sql`SELECT card_number, name FROM participants WHERE card_number IS NOT NULL ORDER BY CAST(card_number AS INTEGER) DESC LIMIT 10`;
  const lowCards = await sql`SELECT card_number, name FROM participants WHERE card_number IS NOT NULL ORDER BY CAST(card_number AS INTEGER) ASC LIMIT 5`;
  console.log("Total:", count[0].total);
  console.log("Highest:", highCards);
  console.log("Lowest:", lowCards);
  await sql.end();
  process.exit(0);
}

check().catch(console.error);
