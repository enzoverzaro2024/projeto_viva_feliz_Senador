import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const turmas = [
  { name: "Jardín", email: "jardin@colegioadventistapjc.com" },
  { name: "Pre Escolar A", email: "preescolara@colegioadventistapjc.com" },
  { name: "Pre Escolar B", email: "preescolarb@colegioadventistapjc.com" },
  { name: "1° Grado A", email: "1gradoa@colegioadventistapjc.com" },
  { name: "1° Grado B", email: "1gradob@colegioadventistapjc.com" },
  { name: "2° Grado A", email: "2gradoa@colegioadventistapjc.com" },
  { name: "2° Grado B", email: "2gradob@colegioadventistapjc.com" },
  { name: "2° Grado C", email: "2gradoc@colegioadventistapjc.com" },
  { name: "3° Grado A", email: "3gradoa@colegioadventistapjc.com" },
  { name: "3° Grado B", email: "3gradob@colegioadventistapjc.com" },
  { name: "4° Grado A", email: "4gradoa@colegioadventistapjc.com" },
  { name: "4° Grado B", email: "4gradob@colegioadventistapjc.com" },
  { name: "5° Grado", email: "5grado@colegioadventistapjc.com" },
  { name: "6° Grado", email: "6grado@colegioadventistapjc.com" },
  { name: "7° Grado", email: "7grado@colegioadventistapjc.com" },
  { name: "8° Grado", email: "8grado@colegioadventistapjc.com" },
  { name: "9° Grado", email: "9grado@colegioadventistapjc.com" },
  { name: "1° de la Media", email: "1delamedia@colegioadventistapjc.com" },
  { name: "2° de la Media", email: "2delamedia@colegioadventistapjc.com" },
];

async function run() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });
  const defaultPasswordHash = await bcrypt.hash("123456", 12);

  console.log("🚀 Iniciando criação/atualização dos usuários de voluntários por turma...");

  for (const t of turmas) {
    const existing = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${t.email})`;
    if (existing.length > 0) {
      await sql`
        UPDATE users
        SET name = ${t.name}, password = ${defaultPasswordHash}, role = 'volunteer', updated_at = NOW()
        WHERE LOWER(email) = LOWER(${t.email})
      `;
      console.log(`🔄 Atualizado: ${t.name} (${t.email})`);
    } else {
      await sql`
        INSERT INTO users (name, email, password, role, created_at, updated_at)
        VALUES (${t.name}, ${t.email}, ${defaultPasswordHash}, 'volunteer', NOW(), NOW())
      `;
      console.log(`✅ Criado: ${t.name} (${t.email})`);
    }
  }

  console.log("\n🎉 SUCESSO! Todos os 19 usuários de turmas foram criados/atualizados com a senha '123456' e role 'volunteer'.");
  await sql.end();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
