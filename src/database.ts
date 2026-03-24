import "dotenv/config";
import pg from "pg";
import logger from "./shared/logger";

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function initializeDatabase(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      tax_id TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      zip_code TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      category TEXT,
      image_url TEXT,
      slug TEXT UNIQUE,
      file_url TEXT NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      discount INTEGER NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      min_order_value INTEGER,
      expires_at TIMESTAMP NOT NULL,
      usage_limit INTEGER NOT NULL,
      current_usage INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT TRUE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      coupon_id INTEGER REFERENCES coupons(id),
      status TEXT NOT NULL DEFAULT 'pending',
      total INTEGER NOT NULL,
      payment_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) NOT NULL,
      product_id INTEGER REFERENCES products(id) NOT NULL,
      price INTEGER NOT NULL,
      download_token TEXT UNIQUE,
      token_expires_at TIMESTAMP,
      download_count INTEGER DEFAULT 0,
      max_downloads INTEGER
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      product_id INTEGER REFERENCES products(id) NOT NULL,
      rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    )
  `);
}

async function runMigrations(): Promise<void> {
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_id TEXT`);
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='stripe_payment_id') THEN
        ALTER TABLE orders RENAME COLUMN stripe_payment_id TO payment_id;
      END IF;
    END $$
  `);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`);
}

initializeDatabase().catch((err) => logger.error({ err }, "Database initialization failed"));
runMigrations().catch((err) => logger.error({ err }, "Migration failed"));

export default db;
