import postgres from 'postgres';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function writeReport() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    const records = await sql`
      SELECT id, name, card_number, current_balance, created_at 
      FROM participants 
      ORDER BY created_at DESC
      LIMIT 100
    `;

    let report = "--- RELATÓRIO DE PARTICIPANTES RECENTES ---\n\n";
    for (const r of records) {
      report += `ID: ${r.id} | Nome: ${r.name} | Cartão: ${r.card_number} | Saldo: ${r.current_balance} | Criado: ${r.created_at.toISOString()}\n`;
    }

    fs.writeFileSync('resultado_limpeza.txt', report);
    console.log("Relatório gravado em resultado_limpeza.txt");

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

writeReport();
