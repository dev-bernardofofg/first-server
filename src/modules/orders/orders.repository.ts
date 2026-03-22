import type pg from "pg";

interface CreateOrderData {
  userId: number;
  total: number;
  couponId: number | null;
  items: Array<{ productId: number; price: number }>;
}

export class OrdersRepository {
  constructor(private db: pg.Pool) {}

  async create(data: CreateOrderData) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");

      const {
        rows: [order],
      } = await client.query(
        `INSERT INTO orders (user_id, total, coupon_id) VALUES ($1, $2, $3) RETURNING *`,
        [data.userId, data.total, data.couponId],
      );

      for (const item of data.items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, price) VALUES ($1, $2, $3)`,
          [order.id, item.productId, item.price],
        );
      }

      await client.query("COMMIT");
      return order;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async findAllByUserId(userId: number) {
    const { rows } = await this.db.query(
      `SELECT o.*,
        COALESCE(
          json_agg(
            json_build_object('id', oi.id, 'product_id', oi.product_id, 'price', oi.price)
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId],
    );
    return rows;
  }

  async findByIdAndUserId(id: number, userId: number) {
    const {
      rows: [order],
    } = await this.db.query(
      `SELECT o.*,
        COALESCE(
          json_agg(
            json_build_object('id', oi.id, 'product_id', oi.product_id, 'price', oi.price)
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [id, userId],
    );
    return order ?? null;
  }
}
