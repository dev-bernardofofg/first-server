import "dotenv/config";
import pg from "pg";

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function initializeDatabase(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS contatos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      sobrenome TEXT NOT NULL
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL
    )
  `);
}

initializeDatabase().catch(console.error);

export default db;
