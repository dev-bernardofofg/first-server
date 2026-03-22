import type pg from "pg";

interface CreateReviewData {
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
}

export class ReviewsRepository {
  constructor(private db: pg.Pool) {}

  async hasPaidOrderWithProduct(userId: number, productId: number) {
    const {
      rows: [row],
    } = await this.db.query(
      `SELECT 1 FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'paid'
       LIMIT 1`,
      [userId, productId],
    );
    return !!row;
  }

  async create(data: CreateReviewData) {
    const {
      rows: [review],
    } = await this.db.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.userId, data.productId, data.rating, data.comment],
    );
    return review;
  }

  async findByProductId(productId: number) {
    const { rows } = await this.db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
        json_build_object('id', u.id, 'name', u.name, 'last_name', u.last_name) AS user
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId],
    );
    return rows;
  }
}
