import type pg from "pg";

export class UsersRepository {
  constructor(private db: pg.Pool) {}

  async findByEmail(email: string) {
    const {
      rows: [user],
    } = await this.db.query("SELECT * FROM users WHERE email = $1", [email]);
    return user ?? null;
  }

  async findById(id: number) {
    const {
      rows: [user],
    } = await this.db.query("SELECT * FROM users WHERE id = $1", [id]);
    return user ?? null;
  }

  async create(email: string, hashedPassword: string) {
    const {
      rows: [user],
    } = await this.db.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [email, hashedPassword],
    );
    return user;
  }
}
