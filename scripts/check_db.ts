import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const conn = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || "";
const client = postgres(conn);
const db = drizzle(client);

async function check() {
  console.log("Conectando ao banco...");
  const pCount = await db.execute("SELECT count(*) FROM participants");
  const aCount = await db.execute("SELECT count(*) FROM attendance");
  const sCount = await db.execute("SELECT count(*) FROM event_settings");
  
  console.log("Participantes:", pCount[0].count);
  console.log("Presenças:", aCount[0].count);
  console.log("Configurações:", sCount[0].count);
  
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
