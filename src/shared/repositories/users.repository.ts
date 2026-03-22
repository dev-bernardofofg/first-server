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
    const {
      rows: [user],
    } = await this.db.query(
      `INSERT INTO users (email, password, name, last_name, phone, tax_id, address, city, state, country, zip_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      ],
    );
    return user;
  }
}
