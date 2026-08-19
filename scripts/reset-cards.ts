import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

  console.log('🔄 Deletando todas as transações...');
  const tResult = await sql`DELETE FROM transactions`;

  console.log('🔄 Deletando todas as presenças...');
  const aResult = await sql`DELETE FROM attendance`;

  console.log('🔄 Deletando todos os participantes/cartões...');
  const pResult = await sql`DELETE FROM participants`;

  console.log('✅ BANCO DE DADOS LIMPO!');
  console.log(`   - Transações removidas: ${tResult.count}`);
  console.log(`   - Presenças removidas: ${aResult.count}`);
  console.log(`   - Cartões/Participantes removidos: ${pResult.count}`);

  await sql.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro ao limpar:', err);
  process.exit(1);
});
