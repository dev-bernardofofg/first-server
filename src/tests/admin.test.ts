import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../app";
import db from "../database";

let adminToken: string;
let customerToken: string;
let orderId: number;

const suffix = Date.now();

beforeAll(async () => {
  const hashedPassword = await bcrypt.hash("123456", 10);
  await db.query(
    `INSERT INTO users (email, password, role, name, last_name)
     VALUES ($1, $2, 'admin', 'Admin', 'Backoffice')
     ON CONFLICT (email) DO NOTHING`,
    [`admin-backoffice-${suffix}@test.com`, hashedPassword],
  );

  const adminLogin = await request(app)
    .post("/auth/login")
    .send({ email: `admin-backoffice-${suffix}@test.com`, password: "123456" });
  adminToken = adminLogin.body.data.token;

  await request(app).post("/auth/register").send({
    email: `customer-backoffice-${suffix}@test.com`,
    password: "123456",
    name: "Customer",
    last_name: "Backoffice",
  });

  const customerLogin = await request(app)
    .post("/auth/login")
    .send({ email: `customer-backoffice-${suffix}@test.com`, password: "123456" });
  customerToken = customerLogin.body.data.token;

  // Seed a product and create an order to use in tests
  const {
    rows: [product],
  } = await db.query(
    `INSERT INTO products (name, price, file_url) VALUES ($1, $2, $3) RETURNING *`,
    ["Admin Test Product", 2000, "https://example.com/admin-test.pdf"],
  );

  const orderRes = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ product_ids: [product.id] });

  orderId = orderRes.body.data.id;
});

describe("GET /admin/orders", () => {
  it("should return all orders as admin", async () => {
    const res = await request(app)
      .get("/admin/orders")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .get("/admin/orders")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/admin/orders");
    expect(res.status).toBe(401);
  });
});

describe("PUT /admin/orders/:id/status", () => {
  it("should update order status as admin", async () => {
    const res = await request(app)
      .put(`/admin/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: orderId, status: "paid" });
  });

  it("should return 404 for non-existent order", async () => {
    const res = await request(app)
      .put("/admin/orders/999999/status")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Order not found" } });
  });

  it("should return 400 for invalid status", async () => {
    const res = await request(app)
      .put(`/admin/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "shipped" });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.status).toBeDefined();
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .put(`/admin/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ status: "paid" });

    expect(res.status).toBe(403);
  });
});

describe("GET /admin/users", () => {
  it("should return all users as admin", async () => {
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data.length).toBeGreaterThan(0);
    // Password must not be exposed
    expect(res.body.data[0].password).toBeUndefined();
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/admin/users");
    expect(res.status).toBe(401);
  });
});

describe("GET /admin/products", () => {
  it("should return all products (including inactive) as admin", async () => {
    const res = await request(app)
      .get("/admin/products")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.any(Array));
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .get("/admin/products")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/admin/products");
    expect(res.status).toBe(401);
  });
});
