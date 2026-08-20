import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const conn = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
const sql = postgres(conn);

async function findAdmin() {
  const adminUsers = await sql`SELECT id, name, email, role FROM users WHERE role = 'admin' OR email = 'enzo@nb.com'`;
  console.log("ADMIN USERS:", adminUsers);

  const allUsers = await sql`SELECT id, name, email, role FROM users ORDER BY id ASC`;
  console.log("ALL USERS:", allUsers);

  await sql.end();
  process.exit(0);
}

findAdmin().catch(console.error);
