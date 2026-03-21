require("dotenv").config();
const { Pool } = require("pg");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function initializeDatabase() {
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

module.exports = db;
