import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../app";
import db from "../database";

let customerToken: string;
let customerId: number;
let productId: number;
let orderId: number;

const suffix = Date.now();
const WEBHOOK_SECRET = "test-webhook-secret";

beforeAll(async () => {
  // Set webhook secret for tests
  process.env.ABACATEPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

  await request(app).post("/auth/register").send({
    email: `payments-test-${suffix}@test.com`,
    password: "123456",
    name: "Payment",
    last_name: "Tester",
  });

  const login = await request(app)
    .post("/auth/login")
    .send({ email: `payments-test-${suffix}@test.com`, password: "123456" });

  customerToken = login.body.data.token;
  customerId = login.body.data.user.id;

  const {
    rows: [product],
  } = await db.query(
    `INSERT INTO products (name, price, file_url) VALUES ($1, $2, $3) RETURNING *`,
    ["Payment Test Product", 5000, "https://example.com/payment-test.pdf"],
  );
  productId = product.id;
});

beforeEach(async () => {
  // Create a fresh pending order for each test that needs one
  const {
    rows: [order],
  } = await db.query(
    `INSERT INTO orders (user_id, total, status) VALUES ($1, $2, 'pending') RETURNING *`,
    [customerId, 5000],
  );
  await db.query(
    `INSERT INTO order_items (order_id, product_id, price) VALUES ($1, $2, $3)`,
    [order.id, productId, 5000],
  );
  orderId = order.id;
});

// --- Webhook tests (no real AbacatePay calls needed) ---

function makeWebhookPayload(billingId: string, event = "checkout.completed") {
  return JSON.stringify({
    event,
    apiVersion: 2,
    devMode: true,
    data: {
      checkout: {
        id: billingId,
        status: "PAID",
        amount: 5000,
      },
    },
  });
}

describe("POST /payments/webhook", () => {
  it("should return 400 for wrong secret", async () => {
    const body = makeWebhookPayload("bill_test_123");

    const res = await request(app)
      .post(`/payments/webhook?webhookSecret=WRONG`)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: "Invalid webhook secret" } });
  });

  it("should mark order as paid and generate download tokens", async () => {
    // Seed the billing ID on the order
    const billingId = `bill_test_${suffix}_${orderId}`;
    await db.query(`UPDATE orders SET payment_id = $1 WHERE id = $2`, [billingId, orderId]);

    const body = makeWebhookPayload(billingId);

    const res = await request(app)
      .post(`/payments/webhook?webhookSecret=${WEBHOOK_SECRET}`)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(200);

    // Order should be paid
    const { rows: [order] } = await db.query("SELECT * FROM orders WHERE id = $1", [orderId]);
    expect(order.status).toBe("paid");

    // Items should have download tokens
    const { rows: items } = await db.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [orderId],
    );
    expect(items[0].download_token).toBeTruthy();
    expect(items[0].max_downloads).toBe(3);
    expect(new Date(items[0].token_expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("should be idempotent — ignore already paid order", async () => {
    const billingId = `bill_idempotent_${suffix}`;
    await db.query(
      `UPDATE orders SET payment_id = $1, status = 'paid' WHERE id = $2`,
      [billingId, orderId],
    );

    const body = makeWebhookPayload(billingId);

    const res = await request(app)
      .post(`/payments/webhook?webhookSecret=${WEBHOOK_SECRET}`)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(200);
  });

  it("should ignore non-checkout.completed events", async () => {
    const body = makeWebhookPayload("bill_other_123", "checkout.refunded");

    const res = await request(app)
      .post(`/payments/webhook?webhookSecret=${WEBHOOK_SECRET}`)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(200);
  });
});

// --- Downloads tests ---

describe("GET /downloads/:token", () => {
  it("should return file_url for a valid token", async () => {
    const token = `test-token-${suffix}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const { rows: [item] } = await db.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [orderId],
    );
    await db.query(
      `UPDATE order_items SET download_token = $1, token_expires_at = $2, max_downloads = 3 WHERE id = $3`,
      [token, expiresAt, item.id],
    );

    const res = await request(app).get(`/downloads/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      file_url: "https://example.com/payment-test.pdf",
    });
  });

  it("should return 404 for non-existent token", async () => {
    const res = await request(app).get("/downloads/invalid-token-xyz");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Invalid download token" } });
  });

  it("should return 400 for expired token", async () => {
    const token = `expired-token-${suffix}`;
    const expiresAt = new Date(Date.now() - 1000); // past

    const { rows: [item] } = await db.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [orderId],
    );
    await db.query(
      `UPDATE order_items SET download_token = $1, token_expires_at = $2, max_downloads = 3 WHERE id = $3`,
      [token, expiresAt, item.id],
    );

    const res = await request(app).get(`/downloads/${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: "Download token has expired" } });
  });

  it("should return 400 when download limit is reached", async () => {
    const token = `exhausted-token-${suffix}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const { rows: [item] } = await db.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [orderId],
    );
    await db.query(
      `UPDATE order_items SET download_token = $1, token_expires_at = $2, max_downloads = 3, download_count = 3 WHERE id = $3`,
      [token, expiresAt, item.id],
    );

    const res = await request(app).get(`/downloads/${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: "Download limit reached" } });
  });

  it("should increment download_count on each access", async () => {
    const token = `count-token-${suffix}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const { rows: [item] } = await db.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [orderId],
    );
    await db.query(
      `UPDATE order_items SET download_token = $1, token_expires_at = $2, max_downloads = 3, download_count = 0 WHERE id = $3`,
      [token, expiresAt, item.id],
    );

    await request(app).get(`/downloads/${token}`);
    await request(app).get(`/downloads/${token}`);

    const { rows: [updated] } = await db.query(
      "SELECT download_count FROM order_items WHERE id = $1",
      [item.id],
    );
    expect(updated.download_count).toBe(2);
  });
});
