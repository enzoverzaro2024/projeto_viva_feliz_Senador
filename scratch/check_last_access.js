const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function main() {
  try {
    const { rows } = await pool.query('SELECT name, email, updated_at FROM users ORDER BY updated_at DESC LIMIT 5');
    console.log('Últimos acessos de administradores/voluntários:');
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

main();
