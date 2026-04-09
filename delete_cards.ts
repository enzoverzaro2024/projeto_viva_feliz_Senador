import { db } from "./src/lib/db/index";
import { participants, transactions } from "./src/lib/db/schema";
import { inArray } from "drizzle-orm";

async function main() {
  console.log("Iniciando limpeza de cartões do 002 ao 112 no banco do Viva Feliz Senador...");

  try {
    // Gerar lista de números de cartão (002 a 112)
    const cardNumbersToDelete: string[] = [];
    for (let i = 2; i <= 112; i++) {
      cardNumbersToDelete.push(i.toString().padStart(3, '0'));
    }

    console.log(`Buscando ${cardNumbersToDelete.length} cartões para exclusão...`);

    // Pega os IDs desses participantes
    const participantsToDelete = await db
      .select({ id: participants.id, cardNumber: participants.cardNumber })
      .from(participants)
      .where(inArray(participants.cardNumber, cardNumbersToDelete));

    if (participantsToDelete.length === 0) {
      console.log("Nenhum cartão encontrado neste intervalo.");
      process.exit(0);
    }

    const participantIds = participantsToDelete.map(p => p.id);
    console.log(`${participantIds.length} cartões encontrados no banco de dados. Apagando transações...`);

    // Limpar transações primeiro (por causa da restrição de chave estrangeira)
    const deletedTx = await db
      .delete(transactions)
      .where(inArray(transactions.participantId, participantIds))
      .returning();
    
    console.log(`${deletedTx.length} transações apagadas.`);

    console.log("Apagando os cartões...");
    // Agora exclui os participantes
    const deletedCards = await db
      .delete(participants)
      .where(inArray(participants.id, participantIds))
      .returning();

    console.log(`✅ ${deletedCards.length} cartões deletados com sucesso! (Do 002 ao 112)`);
  } catch (error) {
    console.error("Erro durante a exclusão:", error);
  } finally {
    process.exit(0);
  }
}

main();
