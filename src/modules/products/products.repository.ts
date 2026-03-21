import type pg from "pg";

interface CreateProductData {
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  file_url: string;
}

export class ProductsRepository {
  constructor(private db: pg.Pool) {}

  async findAllActive() {
    const { rows } = await this.db.query(
      "SELECT * FROM products WHERE active = TRUE",
    );
    return rows;
  }

  async findActiveById(id: number) {
    const {
      rows: [product],
    } = await this.db.query(
      "SELECT * FROM products WHERE id = $1 AND active = TRUE",
      [id],
    );
    return product ?? null;
  }

  async create(data: CreateProductData) {
    const {
      rows: [product],
    } = await this.db.query(
      `INSERT INTO products (name, description, price, category, file_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.name, data.description, data.price, data.category, data.file_url],
    );
    return product;
  }

  async update(id: number, data: CreateProductData) {
    const {
      rows: [product],
    } = await this.db.query(
      `UPDATE products SET name = $1, description = $2, price = $3, category = $4, file_url = $5
       WHERE id = $6 AND active = TRUE RETURNING *`,
      [data.name, data.description, data.price, data.category, data.file_url, id],
    );
    return product ?? null;
  }

  async deactivate(id: number) {
    const {
      rows: [product],
    } = await this.db.query(
      "UPDATE products SET active = FALSE WHERE id = $1 AND active = TRUE RETURNING *",
      [id],
    );
    return product ?? null;
  }
}
