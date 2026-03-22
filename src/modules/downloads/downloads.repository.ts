import type pg from "pg";

export class DownloadsRepository {
  constructor(private db: pg.Pool) {}

  async findByToken(token: string) {
    const {
      rows: [item],
    } = await this.db.query(
      `SELECT oi.id, oi.download_count, oi.max_downloads, oi.token_expires_at, p.file_url
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.download_token = $1`,
      [token],
    );
    return item ?? null;
  }

  async incrementCount(id: number) {
    await this.db.query(
      "UPDATE order_items SET download_count = download_count + 1 WHERE id = $1",
      [id],
    );
  }
}
