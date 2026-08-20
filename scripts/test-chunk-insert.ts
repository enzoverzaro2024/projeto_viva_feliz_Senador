import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { randomUUID } from "crypto";

const conn = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
const sql = postgres(conn, { ssl: "require", max: 5 });

async function testChunkInsert() {
  console.log("Generating 200 cards in chunks of 50...");

  const total = 200;
  const chunkSize = 50;
  const created = [];

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = [];
    for (let j = 0; j < chunkSize && (i + j) < total; j++) {
      const num = 1000 + i + j + 1;
      const padded = String(num);
      const cardId = `EC-${padded}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const uniqueEmail = `cartao${padded}-${randomUUID().slice(0, 4).toLowerCase()}@evento.local`;
      chunk.push({
        user_id: 1,
        name: "",
        email: uniqueEmail,
        phone: "---",
        card_id: cardId,
        card_number: padded,
        current_balance: "0"
      });
      created.push({ num: padded, cardId, name: `Cartão #${padded}`, cardNumber: padded });
    }

    console.log(`Inserting chunk of ${chunk.length} cards...`);
    await sql`
      INSERT INTO participants ${sql(chunk, 'user_id', 'name', 'email', 'phone', 'card_id', 'card_number', 'current_balance')}
    `;
  }

  console.log(`✅ SUCCESS! Inserted ${created.length} cards in chunks!`);

  // Clean up
  await sql`DELETE FROM participants WHERE CAST(card_number AS INTEGER) > 1000`;
  console.log("✅ Cleaned up test cards!");

  await sql.end();
  process.exit(0);
}

testChunkInsert().catch(err => {
  console.error("Chunk insert error:", err);
  process.exit(1);
});
