import "dotenv/config";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = await import("../src/lib/db");
  const { participants, transactions, users } = await import("../src/lib/db/schema");
  console.log("Iniciando o reset do histórico de transações...");
  
  // 1. Apagar todo o historico
  await db.delete(transactions);
  console.log("Histórico antigo apagado.");

  // 2. Pegar um usuário principal para ser o 'criador' da transação inicial
  const adminQuery = await db.select().from(users).limit(1);
  const defaultVolunteerId = adminQuery.length > 0 ? adminQuery[0].id : 1;

  // 3. Pegar todos os participantes que têm saldo > 0
  const allParticipants = await db.select().from(participants).where(sql`CAST(current_balance AS NUMERIC) > 0`);
  
  console.log(`Encontrados ${allParticipants.length} participantes com saldo no momento.`);

  // 4. Criar o "Saldo inicial" para eles
  let n = 0;
  for (const p of allParticipants) {
    await db.insert(transactions).values({
      participantId: p.id,
      volunteerId: defaultVolunteerId,
      amount: p.currentBalance,
      description: "Saldo do dia 28/03 até dia 30/03",
      createdAt: new Date(),
    });
    n++;
  }

  console.log(`Criado extrato consolidado para ${n} participantes.`);
  process.exit(0);
}

main().catch(err => {
  console.error("Erro no script:", err);
  process.exit(1);
});
