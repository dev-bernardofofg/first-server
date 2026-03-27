import type pg from "pg";

interface ProductData {
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  slug: string | null;
  file_url: string | null;
}

export class ProductsRepository {
  constructor(private db: pg.Pool) { }

  async findAll() {
    const { rows } = await this.db.query(
      "SELECT * FROM products ORDER BY created_at DESC",
    );
    return rows;
  }

  async findAllActive() {
    const { rows } = await this.db.query(
      "SELECT * FROM products WHERE active = TRUE ORDER BY created_at DESC",
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

  async create(data: ProductData) {
    const {
      rows: [product],
    } = await this.db.query(
      `INSERT INTO products (name, description, price, category, image_url, slug, file_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.name, data.description, data.price, data.category, data.image_url, data.slug, data.file_url],
    );
    return product;
  }

  async update(id: number, data: ProductData) {
    const {
      rows: [product],
    } = await this.db.query(
      `UPDATE products
       SET name = $1, description = $2, price = $3, category = $4,
           image_url = $5, slug = $6, file_url = $7, updated_at = NOW()
       WHERE id = $8 AND active = TRUE RETURNING *`,
      [data.name, data.description, data.price, data.category, data.image_url, data.slug, data.file_url, id],
    );
    return product ?? null;
  }

  async deactivate(id: number) {
    const {
      rows: [product],
    } = await this.db.query(
      "UPDATE products SET active = FALSE, updated_at = NOW() WHERE id = $1 AND active = TRUE RETURNING *",
      [id],
    );
    return product ?? null;
  }
}
