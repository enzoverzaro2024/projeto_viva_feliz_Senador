import postgres from 'postgres';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkIsabela() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    const isabelas = await sql`SELECT id, name, card_number, current_balance, created_at FROM participants WHERE name ILIKE '%ISABELA%' OR card_number = '101'`;

    let report = "--- BUSCA ISABELA / CARTÃO 101 ---\n\n";
    for (const r of isabelas) {
      report += `ID: ${r.id} | Nome: ${r.name} | Cartão: ${r.card_number} | Saldo: ${r.current_balance} | Criado: ${r.created_at.toISOString()}\n`;
    }

    fs.appendFileSync('resultado_limpeza.txt', "\n\n" + report);
    console.log("Busca concluída!");

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

checkIsabela();
