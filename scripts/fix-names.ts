import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do seu projeto
dotenv.config({ path: '.env.local' });

async function fixNames() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("Erro: DATABASE_URL não encontrada no .env.local");
    return;
  }

  const sql = postgres(dbUrl);
  const candidatePaths = [
    path.join(process.cwd(), 'Registros do Projeto Comunitário Viva Feliz.csv'),
    path.join(process.cwd(), '..', 'Registros do Projeto Comunitário Viva Feliz.csv'),
    path.join(process.cwd(), 'data', 'Registros do Projeto Comunitário Viva Feliz.csv'),
  ];
  const csvPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
  
  try {
    console.log("Iniciando correção de dados...");
    
    // Lê o arquivo com a codificação Windows-1252 (Excel Brasil)
    const buffer = fs.readFileSync(csvPath);
    const decoder = new TextDecoder('windows-1252'); // Isso resolve os caracteres especiais
    const csvText = decoder.decode(buffer);

    const results = Papa.parse(csvText, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true
    });

    const data = results.data as any[];
    let updatedCount = 0;
    let missingCount = 0;

    console.log(`Lendo ${data.length} linhas da planilha...`);

    for (const row of data) {
      // Tenta achar a coluna de cartão com ou sem acento/espaço
      const rawCard = row['CARTÃO'] || row['CARTAO'] || row['CARTÃO '] || row['CARTAO '] || "";
      if (!rawCard) continue;

      // O sistema padroniza com 3 dígitos (ou mais se já for maior)
      const cardNumber = String(rawCard).trim().padStart(3, '0');
      
      const name = row['NOME COMPLETO']?.trim();
      const age = row['IDADE']?.trim() || null;
      const email = row['EMAIL']?.trim() || (name ? `${name.toLowerCase().replace(/\s/g, '.')}@evento.local` : null);
      const phone = row['TELEFONE']?.trim() || "---";
      const address = row['ENDEREÇO']?.trim() || row['ENDERECO']?.trim() || null;
      const neighborhood = row['BAIRRO']?.trim() || null;

      if (!name) continue;

      // Executa o update apenas para este cartão
      // Usamos column names do schema (created_at, updated_at etc costumam ser snake_case no migrations)
      // Mas o seu schema.ts indica que a coluna é no plural? Não, é "participants" e as colunas match names
      const result = await sql`
        UPDATE participants
        SET 
          name = ${name},
          email = ${email},
          phone = ${phone},
          age = ${age},
          address = ${address},
          neighborhood = ${neighborhood},
          updated_at = NOW()
        WHERE card_number = ${cardNumber}
      `;

      if (result.count > 0) {
        updatedCount++;
      } else {
        missingCount++;
      }
    }

    console.log(`\n--- RESULTADO FINAL ---`);
    console.log(`✅ Participantes corrigidos: ${updatedCount}`);
    console.log(`❓ Cartões na planilha que não estão no sistema: ${missingCount}`);
    console.log(`🚀 Sucesso! Os nomes foram restaurados sem perder os novos registros ou saldos.`);

  } catch (err) {
    console.error("Erro durante a execução:", err);
  } finally {
    await sql.end();
  }
}

fixNames();
