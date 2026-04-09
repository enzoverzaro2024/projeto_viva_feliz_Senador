import { like, eq } from 'drizzle-orm';
import { participants } from '../src/lib/db/schema';
import * as dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from "drizzle-orm/postgres-js";

dotenv.config({ path: '.env.local' });

async function migrate() {
  console.log("Conectando ao banco de dados...");
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
  if (!connectionString) {
    console.error("Nenhuma connection string encontrada no .env.local!");
    process.exit(1);
  }
  
  const client = postgres(connectionString, { prepare: false, ssl: "require" });
  const db = drizzle(client);

  console.log("Buscando registros 'Cartão #...' ou similar...");
  const usersToUpdate = await db.select().from(participants).where(like(participants.name, 'Cartão %'));
  
  if (usersToUpdate.length === 0) {
      console.log("Nenhum registro para migrar encontrado.");
  }

  for (const user of usersToUpdate) {
    // Regex para pegar tudo depois de 'Cartão # ' ou 'Cartão '
    const cardMatch = user.name.match(/Cartão\s*#?\s*(.+)/i);
    
    if (cardMatch && cardMatch[1]) {
      const extractedNumber = cardMatch[1].trim();
      console.log(`Migrando: ID ${user.id} | Nome antigo: '${user.name}' => cardNumber: '${extractedNumber}'`);
      
      await db.update(participants)
        .set({ 
            cardNumber: extractedNumber,
            name: "" // Deixando o nome vazio como solicitado
        })
        .where(eq(participants.id, user.id));
    }
  }

  console.log("Migração concluída com sucesso!");
  process.exit();
}

migrate().catch(console.error);
