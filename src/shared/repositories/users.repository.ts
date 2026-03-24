import type pg from "pg";

interface CreateUserData {
  email: string;
  hashedPassword: string;
  name: string;
  lastName: string;
  phone: string | null;
  taxId: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  verificationToken: string;
}

export class UsersRepository {
  constructor(private db: pg.Pool) {}

  async findByEmail(email: string) {
    const {
      rows: [user],
    } = await this.db.query("SELECT * FROM users WHERE email = $1", [email]);
    return user ?? null;
  }

  async findAll() {
    const { rows } = await this.db.query(
      "SELECT id, email, name, last_name, phone, address, city, state, country, zip_code, role, created_at FROM users ORDER BY created_at DESC",
    );
    return rows;
  }

  async findById(id: number) {
    const {
      rows: [user],
    } = await this.db.query("SELECT * FROM users WHERE id = $1", [id]);
    return user ?? null;
  }

  async create(data: CreateUserData) {
    const emailVerified = process.env.NODE_ENV === "test";
    const {
      rows: [user],
    } = await this.db.query(
      `INSERT INTO users (email, password, name, last_name, phone, tax_id, address, city, state, country, zip_code, verification_token, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, email, name, last_name, role`,
      [
        data.email,
        data.hashedPassword,
        data.name,
        data.lastName,
        data.phone,
        data.taxId,
        data.address,
        data.city,
        data.state,
        data.country,
        data.zipCode,
        data.verificationToken,
        emailVerified,
      ],
    );
    return user;
  }

  async findByVerificationToken(token: string) {
    const {
      rows: [user],
    } = await this.db.query(
      "SELECT * FROM users WHERE verification_token = $1",
      [token],
    );
    return user ?? null;
  }

  async setVerified(id: number) {
    await this.db.query(
      "UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = $1",
      [id],
    );
  }

  async setVerificationToken(id: number, token: string) {
    await this.db.query(
      "UPDATE users SET verification_token = $1 WHERE id = $2",
      [token, id],
    );
  }

  async findByPasswordResetToken(token: string) {
    const {
      rows: [user],
    } = await this.db.query(
      "SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires_at > NOW()",
      [token],
    );
    return user ?? null;
  }

  async setPasswordResetToken(id: number, token: string, expiresAt: Date) {
    await this.db.query(
      "UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3",
      [token, expiresAt, id],
    );
  }

  async updatePassword(id: number, hashedPassword: string) {
    await this.db.query(
      "UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires_at = NULL WHERE id = $2",
      [hashedPassword, id],
    );
  }
}
