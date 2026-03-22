import type pg from "pg";

export class CouponsRepository {
  constructor(private db: pg.Pool) {}

  async findByCode(code: string) {
    const {
      rows: [coupon],
    } = await this.db.query("SELECT * FROM coupons WHERE code = $1", [code]);
    return coupon ?? null;
  }
}
