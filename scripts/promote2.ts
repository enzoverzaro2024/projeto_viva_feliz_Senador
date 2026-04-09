import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`UPDATE users SET role = 'admin' WHERE id = 2`;
  console.log("✅ ENZO VERZARO (ID: 2) promovido a ADMIN!");
  process.exit(0);
}

run().catch(console.error);
