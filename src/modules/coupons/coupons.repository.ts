import type pg from "pg";

interface CouponData {
  code: string;
  discount: number;
  discount_type: string;
  expires_at: Date;
  usage_limit: number;
  min_order_value: number | null;
}

export class CouponsRepository {
  constructor(private db: pg.Pool) {}

  async findAll() {
    const { rows } = await this.db.query(
      "SELECT * FROM coupons ORDER BY id DESC",
    );
    return rows;
  }

  async findById(id: number) {
    const {
      rows: [coupon],
    } = await this.db.query("SELECT * FROM coupons WHERE id = $1", [id]);
    return coupon ?? null;
  }

  async findByCode(code: string) {
    const {
      rows: [coupon],
    } = await this.db.query("SELECT * FROM coupons WHERE code = $1", [code]);
    return coupon ?? null;
  }

  async create(data: CouponData) {
    const {
      rows: [coupon],
    } = await this.db.query(
      `INSERT INTO coupons (code, discount, discount_type, expires_at, usage_limit, min_order_value)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.code,
        data.discount,
        data.discount_type,
        data.expires_at,
        data.usage_limit,
        data.min_order_value,
      ],
    );
    return coupon;
  }

  async update(id: number, data: CouponData) {
    const {
      rows: [coupon],
    } = await this.db.query(
      `UPDATE coupons
       SET code = $1, discount = $2, discount_type = $3, expires_at = $4,
           usage_limit = $5, min_order_value = $6
       WHERE id = $7 RETURNING *`,
      [
        data.code,
        data.discount,
        data.discount_type,
        data.expires_at,
        data.usage_limit,
        data.min_order_value,
        id,
      ],
    );
    return coupon ?? null;
  }

  async incrementUsage(id: number) {
    await this.db.query(
      "UPDATE coupons SET current_usage = current_usage + 1 WHERE id = $1",
      [id],
    );
  }

  async deactivate(id: number) {
    const {
      rows: [coupon],
    } = await this.db.query(
      "UPDATE coupons SET active = FALSE WHERE id = $1 RETURNING *",
      [id],
    );
    return coupon ?? null;
  }
}
