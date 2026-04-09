import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkRecent() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log("Listando os últimos 100 participantes cadastrados...");
    
    const records = await sql`
      SELECT id, name, card_number, current_balance, created_at 
      FROM participants 
      ORDER BY created_at DESC
      LIMIT 100
    `;

    if (records.length === 0) {
      console.log("Nenhum participante encontrado.");
      return;
    }

    console.table(records.map(r => ({
      ID: r.id,
      Nome: r.name,
      Cartao: r.card_number,
      Saldo: r.current_balance,
      CriadoEm: r.created_at.toLocaleString("pt-BR")
    })));

  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await sql.end();
  }
}

checkRecent();
