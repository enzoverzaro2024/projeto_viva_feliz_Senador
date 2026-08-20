import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const conn = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
const sql = postgres(conn);

async function test() {
  console.log("Checking users in DB...");
  const users = await sql`SELECT id, email, role FROM users LIMIT 5`;
  console.log("Users:", users);

  console.log("Checking cards around 201...");
  const cards = await sql`SELECT id, user_id, card_number, card_id, email FROM participants ORDER BY id DESC LIMIT 5`;
  console.log("Recent participants:", cards);

  try {
    console.log("Attempting single insert of card 202...");
    const res = await sql`
      INSERT INTO participants (user_id, name, email, phone, card_id, card_number, current_balance)
      VALUES (${users[0].id}, '', 'cartao202-test1@evento.local', '---', 'EC-202-TEST1', '202', '0')
      RETURNING id, card_number
    `;
    console.log("Single insert successful:", res);
  } catch (err: any) {
    console.error("FAILED SINGLE INSERT:");
    console.error("Message:", err.message);
    console.error("Detail:", err.detail);
    console.error("Constraint:", err.constraint_name);
    console.error("Code:", err.code);
  }

  await sql.end();
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
