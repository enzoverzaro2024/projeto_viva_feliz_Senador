import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function promoteFirstAdmin() {
  // List all users
  const users = await sql`SELECT id, name, email, role FROM users ORDER BY id`;
  console.log("Usuários cadastrados:");
  users.forEach((u: any) => console.log(`  ID: ${u.id} | ${u.name} | ${u.email} | role: ${u.role}`));

  if (users.length === 0) {
    console.log("\nNenhum usuário encontrado. Crie uma conta primeiro no site.");
    process.exit(0);
  }

  // Promote first user to admin
  const first = users[0];
  await sql`UPDATE users SET role = 'admin' WHERE id = ${first.id}`;
  console.log(`\n✅ Usuário "${first.name}" (ID: ${first.id}) promovido a ADMIN!`);
  console.log("Faça logout e login novamente no site para ver o dashboard.");

  process.exit(0);
}

promoteFirstAdmin().catch(console.error);
