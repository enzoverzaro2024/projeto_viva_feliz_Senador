import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "../src/lib/db";
import { participants } from "../src/lib/db/schema";
import { randomUUID } from "crypto";

async function testBulkInsert() {
  const toInsert = [];
  for (let i = 1; i <= 200; i++) {
    const num = 1000 + i;
    const padded = String(num);
    const cardId = `EC-${padded}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const uniqueEmail = `cartao${padded}-${randomUUID().slice(0, 4).toLowerCase()}@evento.local`;
    toInsert.push({
      userId: 1,
      name: "",
      email: uniqueEmail,
      phone: "---",
      cardId,
      cardNumber: padded,
      currentBalance: "0",
    });
  }

  try {
    console.log("Attempting Drizzle db.insert with 200 items...");
    await db.insert(participants).values(toInsert);
    console.log("SUCCESSFULLY INSERTED 200 CARDS WITH DRIZZLE!");
    // Clean up test cards
    await db.execute("DELETE FROM participants WHERE CAST(card_number AS INTEGER) > 1000");
    console.log("CLEANED UP TEST CARDS");
  } catch (err: any) {
    console.error("DRIZZLE INSERT ERROR:", err);
  }

  process.exit(0);
}

testBulkInsert().catch(console.error);
