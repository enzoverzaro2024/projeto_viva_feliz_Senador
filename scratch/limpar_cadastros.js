const postgres = require("postgres");

const DATABASE_URL =
  "postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function run() {
  const sql = postgres(DATABASE_URL, { ssl: "require" });
  console.log("=== LIMPEZA DE CADASTROS ===");

  const [antes] = await sql`
    SELECT
      (SELECT COUNT(*) FROM transactions)            AS tr,
      (SELECT COUNT(*) FROM attendance)              AS at,
      (SELECT COUNT(*) FROM participant_specialties) AS ps,
      (SELECT COUNT(*) FROM participants)            AS pt
  `;
  console.log("\nANTES:");
  console.log("  Transacoes: " + antes.tr);
  console.log("  Presencas: " + antes.at);
  console.log("  Especialidades vinculadas: " + antes.ps);
  console.log("  Participantes: " + antes.pt);
  console.log();

  const t = await sql`DELETE FROM transactions`;
  console.log("Transacoes apagadas: " + t.count);

  const at = await sql`DELETE FROM attendance`;
  console.log("Presencas apagadas: " + at.count);

  const ps = await sql`DELETE FROM participant_specialties`;
  console.log("Especialidades vinculadas apagadas: " + ps.count);

  const p = await sql`
    UPDATE participants SET
      name              = 'Participante',
      email             = '',
      phone             = '',
      age               = NULL,
      address           = NULL,
      neighborhood      = NULL,
      current_balance   = 0,
      processed_resgate = 0,
      processed_reforco = 0,
      resgate_note      = NULL,
      reforco_note      = NULL,
      updated_at        = NOW()
  `;
  console.log("Participantes limpos (cartoes/QR codes preservados): " + p.count);

  const [depois] = await sql`
    SELECT
      (SELECT COUNT(*) FROM transactions)            AS tr,
      (SELECT COUNT(*) FROM attendance)              AS at,
      (SELECT COUNT(*) FROM participant_specialties) AS ps,
      (SELECT COUNT(*) FROM participants)            AS pt
  `;
  console.log("\nDEPOIS:");
  console.log("  Transacoes: " + depois.tr);
  console.log("  Presencas: " + depois.at);
  console.log("  Especialidades vinculadas: " + depois.ps);
  console.log("  Participantes mantidos (com cardId/cardNumber): " + depois.pt);
  console.log();
  console.log("LIMPEZA CONCLUIDA! Prontos para o novo evangelismo.");

  await sql.end();
}

run().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
