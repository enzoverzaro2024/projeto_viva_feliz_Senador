import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "../src/lib/db";
import { participants } from "../src/lib/db/schema";
import postgres from "postgres";
import { randomUUID } from "crypto";

const conn = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

async function compare() {
  console.log("1. Testing Drizzle insert with 20 items...");
  const items = [];
  for (let i = 1; i <= 20; i++) {
    const num = 2000 + i;
    items.push({
      userId: 1,
      name: "",
      email: `test${num}-${randomUUID().slice(0,4)}@evento.local`,
      phone: "---",
      cardId: `EC-${num}-${randomUUID().slice(0,6).toUpperCase()}`,
      cardNumber: String(num),
      currentBalance: "0",
    });
  }

  try {
    await db.insert(participants).values(items);
    console.log("✅ Drizzle insert of 20 items SUCCEEDED!");
  } catch (err: any) {
    console.error("❌ Drizzle insert FAILED:", err);
  }

  console.log("2. Testing raw postgres client insert of 20 items...");
  const sql = postgres(conn, { ssl: "require" });
  try {
    const rows = items.map(c => [c.userId, c.name, c.email, c.phone, c.cardId, c.cardNumber, c.currentBalance]);
    await sql`
      INSERT INTO participants (user_id, name, email, phone, card_id, card_number, current_balance)
      VALUES ${sql(rows)}
    `;
    console.log("✅ Raw postgres insert SUCCEEDED!");
  } catch (err: any) {
    console.error("❌ Raw postgres insert FAILED:", err);
  }

  // Cleanup
  await sql`DELETE FROM participants WHERE CAST(card_number AS INTEGER) >= 2000`;
  console.log("Cleaned up test cards");

  await sql.end();
  process.exit(0);
}

compare().catch(console.error);
