import { NotFoundError, ValidationError } from "../../shared/errors/app-error";
import type { OrdersRepository } from "./orders.repository";
import type { ProductsRepository } from "../products/products.repository";
import type { CouponsRepository } from "../coupons/coupons.repository";

export class OrdersService {
  constructor(
    private ordersRepository: OrdersRepository,
    private productsRepository: ProductsRepository,
    private couponsRepository: CouponsRepository,
  ) {}

  async create(userId: number, productIds: number[], couponCode?: string) {
    const products = await Promise.all(
      productIds.map((id) => this.productsRepository.findActiveById(id)),
    );

    const missingIndex = products.findIndex((p) => p === null);
    if (missingIndex !== -1) {
      throw new NotFoundError(`Product ${productIds[missingIndex]} not found`);
    }

    let couponId: number | null = null;
    let discount = 0;

    if (couponCode) {
      const coupon = await this.couponsRepository.findByCode(couponCode);
      if (!coupon) throw new NotFoundError("Coupon not found");
      if (new Date(coupon.expires_at) < new Date())
        throw new ValidationError("Coupon has expired");
      if (coupon.current_usage >= coupon.usage_limit)
        throw new ValidationError("Coupon usage limit reached");

      couponId = coupon.id;
      discount = Number(coupon.discount);
    }

    const subtotal = products.reduce((sum, p) => sum + Number(p!.price), 0);
    const total = parseFloat((subtotal * (1 - discount / 100)).toFixed(2));

    return this.ordersRepository.create({
      userId,
      total,
      couponId,
      items: products.map((p) => ({ productId: p!.id, price: Number(p!.price) })),
    });
  }

  async getAll(userId: number) {
    return this.ordersRepository.findAllByUserId(userId);
  }

  async getById(id: number, userId: number) {
    const order = await this.ordersRepository.findByIdAndUserId(id, userId);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  }
}
