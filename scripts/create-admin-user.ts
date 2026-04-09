import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import bcrypt from "bcryptjs";

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function createAdmin() {
  const name = "Enzo Admin";
  const email = "enzo@nb.com";
  const password = "senha 180780";
  
  console.log(`Criando usuário admin: ${email}...`);

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const [user] = await sql`
      INSERT INTO users (name, email, password, role)
      VALUES (${name}, ${email}, ${hashedPassword}, 'admin')
      RETURNING id, name, email, role
    `;
    
    console.log(`✅ Admin criado com sucesso!`);
    console.log(`ID: ${user.id}`);
    console.log(`Nome: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
  } catch (err: any) {
    if (err.code === '23505') {
      console.log("❌ Erro: Este email já está cadastrado.");
    } else {
      console.error("❌ Erro ao criar admin:", err);
    }
  }

  process.exit(0);
}

createAdmin().catch(console.error);
