const postgres = require('postgres');

const sql = postgres('postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  try {
    const users = await sql`SELECT name, email, role, updated_at FROM users ORDER BY updated_at DESC LIMIT 5`;
    console.log('--- Últimos 5 acessos de Usuários (Admins/Voluntários) ---');
    console.table(users);
    
    // Opcionalmente, pegar os últimos acessos de participantes usando createdAt, mas eles não têm lastLogin/updatedAt sendo atualizado no login.
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
