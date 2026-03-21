import type pg from "pg";

export class ContactsRepository {
  constructor(private db: pg.Pool) {}

  async findAll() {
    const { rows } = await this.db.query("SELECT * FROM contacts");
    return rows;
  }

  async findById(id: number) {
    const {
      rows: [contact],
    } = await this.db.query("SELECT * FROM contacts WHERE id = $1", [id]);
    return contact ?? null;
  }

  async create(name: string, lastName: string) {
    const {
      rows: [contact],
    } = await this.db.query(
      "INSERT INTO contacts (name, last_name) VALUES ($1, $2) RETURNING *",
      [name, lastName],
    );
    return contact;
  }

  async update(id: number, name: string, lastName: string) {
    const {
      rows: [contact],
    } = await this.db.query(
      "UPDATE contacts SET name = $1, last_name = $2 WHERE id = $3 RETURNING *",
      [name, lastName, id],
    );
    return contact ?? null;
  }

  async delete(id: number) {
    const {
      rows: [contact],
    } = await this.db.query(
      "DELETE FROM contacts WHERE id = $1 RETURNING *",
      [id],
    );
    return contact ?? null;
  }
}
