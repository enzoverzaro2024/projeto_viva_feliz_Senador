import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

async function clearAll() {
  const conn = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
  const sql = postgres(conn, { ssl: "require" });

  // Get placeholder participant IDs (empty name or "Cartão #NNN" pattern)
  const placeholderIds = await sql`
    SELECT id FROM participants 
    WHERE card_number IS NOT NULL 
    AND (name = '' OR name ~ '^Cart.o #[0-9]+$')
  `;
  const ids = placeholderIds.map((p: any) => p.id);
  console.log("Found placeholder participants:", ids.length);

  if (ids.length > 0) {
    // Delete transactions for these participants
    const txDel = await sql`DELETE FROM transactions WHERE participant_id = ANY(${ids})`;
    console.log("Transactions deleted:", txDel.count);
    // Delete attendance for these participants
    const attDel = await sql`DELETE FROM attendance WHERE participant_id = ANY(${ids})`;
    console.log("Attendance deleted:", attDel.count);
    // Delete the placeholder participants
    const pDel = await sql`DELETE FROM participants WHERE id = ANY(${ids})`;
    console.log("Placeholder participants deleted:", pDel.count);
  }

  const remaining = await sql`SELECT COUNT(*) as total FROM participants`;
  console.log("✅ Remaining participants:", remaining[0].total);
  await sql.end();
  process.exit(0);
}

clearAll().catch(console.error);
