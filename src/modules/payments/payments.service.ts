import crypto from "node:crypto";
import { NotFoundError, ValidationError } from "../../shared/errors/app-error";
import type { CouponsRepository } from "../coupons/coupons.repository";
import type { OrdersRepository } from "../orders/orders.repository";

const TOKEN_EXPIRY_HOURS = 48;
const MAX_DOWNLOADS = 3;
const ABACATEPAY_BASE = "https://api.abacatepay.com/v1";

export class PaymentsService {
  constructor(
    private ordersRepository: OrdersRepository,
    private couponsRepository: CouponsRepository,
  ) {}

  async createCheckout(orderId: number, userId: number) {
    const order = await this.ordersRepository.findByIdForCheckout(orderId, userId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== "pending") throw new ValidationError("Order is not pending");

    const body = {
      frequency: "ONE_TIME",
      methods: ["PIX", "CARD"],
      products: order.items.map((item: any) => ({
        externalId: `product-${item.product_id}`,
        name: item.product_name,
        quantity: 1,
        price: item.price,
      })),
      returnUrl: `${process.env.FRONTEND_URL}/orders/${order.id}`,
      completionUrl: `${process.env.FRONTEND_URL}/orders/${order.id}/success`,
      customer: {
        name: `${order.user.name} ${order.user.last_name}`,
        email: order.user.email,
        cellphone: order.user.phone ?? "00000000000",
      },
    };

    const response = await fetch(`${ABACATEPAY_BASE}/billing/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json() as any;

    if (!response.ok || result.error || !result.data) {
      throw new ValidationError(
        `Payment gateway error (${response.status}): ${JSON.stringify(result)}`,
      );
    }

    await this.ordersRepository.setPaymentId(orderId, result.data.id);

    return { checkout_url: result.data.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string, querySecret: string) {
    // Validate query param secret
    if (querySecret !== process.env.ABACATEPAY_WEBHOOK_SECRET) {
      throw new ValidationError("Invalid webhook secret");
    }

    // Validate HMAC-SHA256 signature using AbacatePay's public key
    if (signature && process.env.ABACATEPAY_PUBLIC_KEY) {
      const expected = crypto
        .createHmac("sha256", process.env.ABACATEPAY_PUBLIC_KEY)
        .update(rawBody)
        .digest("base64");

      const valid =
        Buffer.byteLength(expected) === Buffer.byteLength(signature) &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

      if (!valid) throw new ValidationError("Invalid webhook signature");
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    if (payload.event !== "checkout.completed") return;

    const billingId: string = payload.data?.checkout?.id;
    if (!billingId) return;

    await this.processPayment(billingId);
  }

  private async processPayment(billingId: string) {
    const order = await this.ordersRepository.findByPaymentId(billingId);
    if (!order || order.status === "paid") return;

    await this.ordersRepository.markAsPaid(order.id);

    const items = await this.ordersRepository.findItemsById(order.id);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    for (const item of items) {
      const token = crypto.randomUUID();
      await this.ordersRepository.updateItemToken(item.id, token, expiresAt, MAX_DOWNLOADS);
    }

    if (order.coupon_id) {
      await this.couponsRepository.incrementUsage(order.coupon_id);
    }
  }
}
