import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_LAST_NAME } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_NAME || !ADMIN_LAST_NAME) {
  console.error("Missing required env vars: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_LAST_NAME");
  process.exit(1);
}

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function seedAdmin() {
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [ADMIN_EMAIL]);

  if (existing.rows.length > 0) {
    console.log(`Admin user with email "${ADMIN_EMAIL}" already exists.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD!, 10);

  const { rows: [user] } = await db.query(
    `INSERT INTO users (email, password, role, name, last_name)
     VALUES ($1, $2, 'admin', $3, $4)
     RETURNING id, email, name, last_name, role`,
    [ADMIN_EMAIL, hashedPassword, ADMIN_NAME, ADMIN_LAST_NAME],
  );

  console.log(`Admin created: ${user.name} ${user.last_name} <${user.email}> (id: ${user.id})`);
}

seedAdmin()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  })
  .finally(() => db.end());
