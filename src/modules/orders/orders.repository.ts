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

  async findAll() {
    const { rows } = await this.db.query(
      `SELECT o.id, o.status, o.total, o.stripe_payment_id, o.coupon_id, o.created_at, o.updated_at,
        json_build_object('id', u.id, 'email', u.email, 'name', u.name, 'last_name', u.last_name) AS user,
        COALESCE(
          json_agg(
            json_build_object('id', oi.id, 'product_id', oi.product_id, 'price', oi.price)
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY o.id, u.id
       ORDER BY o.created_at DESC`,
    );
    return rows;
  }

  async updateStatus(id: number, status: string) {
    const {
      rows: [order],
    } = await this.db.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id],
    );
    return order ?? null;
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

  async findById(id: number) {
    const {
      rows: [order],
    } = await this.db.query("SELECT * FROM orders WHERE id = $1", [id]);
    return order ?? null;
  }

  async findByPaymentId(paymentId: string) {
    const {
      rows: [order],
    } = await this.db.query("SELECT * FROM orders WHERE stripe_payment_id = $1", [paymentId]);
    return order ?? null;
  }

  async findByIdForCheckout(id: number, userId: number) {
    const {
      rows: [order],
    } = await this.db.query(
      `SELECT o.id, o.status, o.total, o.coupon_id,
        json_build_object('id', u.id, 'name', u.name, 'last_name', u.last_name, 'email', u.email, 'phone', u.phone) AS user,
        COALESCE(
          json_agg(
            json_build_object('id', oi.id, 'product_id', oi.product_id, 'price', oi.price, 'product_name', p.name)
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id, u.id`,
      [id, userId],
    );
    return order ?? null;
  }

  async setPaymentId(id: number, paymentId: string) {
    await this.db.query(
      "UPDATE orders SET stripe_payment_id = $1, updated_at = NOW() WHERE id = $2",
      [paymentId, id],
    );
  }

  async markAsPaid(id: number) {
    await this.db.query(
      "UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = $1",
      [id],
    );
  }

  async findItemsById(orderId: number) {
    const { rows } = await this.db.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [orderId],
    );
    return rows;
  }

  async updateItemToken(itemId: number, token: string, expiresAt: Date, maxDownloads: number) {
    await this.db.query(
      "UPDATE order_items SET download_token = $1, token_expires_at = $2, max_downloads = $3 WHERE id = $4",
      [token, expiresAt, maxDownloads, itemId],
    );
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
