import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function audit() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log("Iniciando auditoria da importação de ontem (14:30 - 15:30)...");
    
    const records = await sql`
      SELECT id, name, card_number, current_balance, created_at 
      FROM participants 
      WHERE created_at >= '2026-04-01 14:30:00' AND created_at <= '2026-04-01 15:30:00'
      ORDER BY created_at ASC
    `;

    if (records.length === 0) {
      console.log("Nenhum registro encontrado nesse horário.");
      return;
    }

    console.log(`Encontrados ${records.length} registros criados durante a janela do erro.`);
    console.table(records.map(r => ({
      ID: r.id,
      Nome: r.name,
      Cartao: r.card_number,
      Saldo: r.current_balance,
      CriadoEm: r.created_at.toLocaleString("pt-BR")
    })));

    // Checagem específica da Isabela (exemplo citado)
    console.log("\n--- BUSCA ESPECÍFICA: ISABELA ---");
    const isabelas = await sql`
      SELECT id, name, card_number, current_balance, created_at 
      FROM participants 
      WHERE name ILIKE '%ISABELA%'
      ORDER BY created_at DESC
    `;
    
    if (isabelas.length > 0) {
      console.table(isabelas.map(r => ({
        ID: r.id,
        Nome: r.name,
        Cartao: r.card_number,
        Saldo: r.current_balance,
        CriadoEm: r.created_at.toLocaleString("pt-BR")
      })));
    } else {
      console.log("Nenhum registro com o nome 'Isabela' encontrado.");
    }

  } catch (err) {
    console.error("Erro na auditoria:", err);
  } finally {
    await sql.end();
  }
}

audit();
