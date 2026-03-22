import { NotFoundError, ConflictError } from "../../shared/errors/app-error";
import type { CouponsRepository } from "./coupons.repository";

interface CouponInput {
  code: string;
  discount: number;
  discount_type: string;
  expires_at: Date;
  usage_limit: number;
  min_order_value?: number;
}

export class CouponsService {
  constructor(private couponsRepository: CouponsRepository) {}

  async getAll() {
    return this.couponsRepository.findAll();
  }

  async getByCode(code: string) {
    const coupon = await this.couponsRepository.findByCode(code);
    if (!coupon) throw new NotFoundError("Coupon not found");
    return coupon;
  }

  async create(data: CouponInput) {
    const existing = await this.couponsRepository.findByCode(data.code);
    if (existing) throw new ConflictError("Coupon code already exists");

    return this.couponsRepository.create({
      code: data.code.toUpperCase(),
      discount: data.discount,
      discount_type: data.discount_type,
      expires_at: data.expires_at,
      usage_limit: data.usage_limit,
      min_order_value: data.min_order_value ?? null,
    });
  }

  async update(id: number, data: CouponInput) {
    const existing = await this.couponsRepository.findById(id);
    if (!existing) throw new NotFoundError("Coupon not found");

    const byCode = await this.couponsRepository.findByCode(data.code);
    if (byCode && byCode.id !== id) throw new ConflictError("Coupon code already exists");

    const coupon = await this.couponsRepository.update(id, {
      code: data.code.toUpperCase(),
      discount: data.discount,
      discount_type: data.discount_type,
      expires_at: data.expires_at,
      usage_limit: data.usage_limit,
      min_order_value: data.min_order_value ?? null,
    });
    return coupon;
  }

  async deactivate(id: number) {
    const coupon = await this.couponsRepository.deactivate(id);
    if (!coupon) throw new NotFoundError("Coupon not found");
  }
}
