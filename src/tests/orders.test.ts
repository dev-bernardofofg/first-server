import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../app";
import db from "../database";

let customerToken: string;
let productId: number;
let orderId: number;
let validCouponCode: string;
let expiredCouponCode: string;
let exhaustedCouponCode: string;

beforeAll(async () => {
  // Customer user
  await request(app)
    .post("/auth/register")
    .send({ email: "orders-test@test.com", password: "123456" });

  const loginRes = await request(app)
    .post("/auth/login")
    .send({ email: "orders-test@test.com", password: "123456" });

  customerToken = loginRes.body.data.token;

  // Seed product directly (no admin endpoint yet)
  const {
    rows: [product],
  } = await db.query(
    `INSERT INTO products (name, price, file_url) VALUES ($1, $2, $3) RETURNING *`,
    ["Test Product", 10000, "https://example.com/test.pdf"],
  );
  productId = product.id;

  // Seed coupons with unique suffix to avoid conflicts between runs
  const suffix = Date.now();

  const {
    rows: [valid],
  } = await db.query(
    `INSERT INTO coupons (code, discount, expires_at, usage_limit)
     VALUES ($1, 10, NOW() + INTERVAL '1 day', 10) RETURNING *`,
    [`VALID10_${suffix}`],
  );
  validCouponCode = valid.code;

  const {
    rows: [expired],
  } = await db.query(
    `INSERT INTO coupons (code, discount, expires_at, usage_limit)
     VALUES ($1, 10, NOW() - INTERVAL '1 day', 10) RETURNING *`,
    [`EXPIRED_${suffix}`],
  );
  expiredCouponCode = expired.code;

  const {
    rows: [exhausted],
  } = await db.query(
    `INSERT INTO coupons (code, discount, expires_at, usage_limit, current_usage)
     VALUES ($1, 10, NOW() + INTERVAL '1 day', 5, 5) RETURNING *`,
    [`EXHAUSTED_${suffix}`],
  );
  exhaustedCouponCode = exhausted.code;
});

describe("POST /orders", () => {
  it("should create an order without coupon", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ product_ids: [productId] });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.any(Number),
      status: "pending",
      total: 10000,
    });
    orderId = res.body.data.id;
  });

  it("should create an order with a valid coupon", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ product_ids: [productId], coupon_code: validCouponCode });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: "pending",
      total: 9000,
    });
  });

  it("should return 404 for non-existent product", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ product_ids: [999999] });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Product 999999 not found" } });
  });

  it("should return 404 for non-existent coupon", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ product_ids: [productId], coupon_code: "INVALID" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Coupon not found" } });
  });

  it("should return 400 for expired coupon", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ product_ids: [productId], coupon_code: expiredCouponCode });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: "Coupon has expired" } });
  });

  it("should return 400 for exhausted coupon", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ product_ids: [productId], coupon_code: exhaustedCouponCode });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: "Coupon usage limit reached" } });
  });

  it("should return 400 for empty product_ids", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ product_ids: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("should return 401 without token", async () => {
    const res = await request(app)
      .post("/orders")
      .send({ product_ids: [productId] });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { message: "Token not provided" } });
  });
});

describe("GET /orders", () => {
  it("should return all orders for the authenticated user", async () => {
    const res = await request(app)
      .get("/orders")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          status: expect.any(String),
          total: expect.any(Number),
          items: expect.any(Array),
        }),
      ]),
    );
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/orders");
    expect(res.status).toBe(401);
  });
});

describe("GET /orders/:id", () => {
  it("should return order detail with items", async () => {
    const res = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: orderId,
      status: "pending",
      items: expect.arrayContaining([
        expect.objectContaining({ product_id: productId }),
      ]),
    });
  });

  it("should return 404 for non-existent order", async () => {
    const res = await request(app)
      .get("/orders/999999")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Order not found" } });
  });

  it("should return 404 for another user's order", async () => {
    // Create a second user
    await request(app)
      .post("/auth/register")
      .send({ email: "other-user@test.com", password: "123456" });

    const otherLogin = await request(app)
      .post("/auth/login")
      .send({ email: "other-user@test.com", password: "123456" });

    const otherToken = otherLogin.body.data.token;

    const res = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Order not found" } });
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(`/orders/${orderId}`);
    expect(res.status).toBe(401);
  });
});
