import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../app";
import db from "../database";

let adminToken: string;
let customerToken: string;
let productId: number;

const suffix = Date.now();

beforeAll(async () => {
  // Seed admin user directly in the DB
  const hashedPassword = await bcrypt.hash("123456", 10);
  await db.query(
    `INSERT INTO users (email, password, role, name, last_name)
     VALUES ($1, $2, 'admin', 'Admin', 'Test')
     ON CONFLICT (email) DO NOTHING`,
    [`admin-products-${suffix}@test.com`, hashedPassword],
  );

  const adminLogin = await request(app)
    .post("/auth/login")
    .send({ email: `admin-products-${suffix}@test.com`, password: "123456" });
  adminToken = adminLogin.body.data.token;

  // Register customer
  await request(app).post("/auth/register").send({
    email: `customer-products-${suffix}@test.com`,
    password: "123456",
    name: "Customer",
    last_name: "Test",
  });

  const customerLogin = await request(app)
    .post("/auth/login")
    .send({ email: `customer-products-${suffix}@test.com`, password: "123456" });
  customerToken = customerLogin.body.data.token;
});

describe("POST /products", () => {
  it("should create a product as admin", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Test Ebook",
        description: "A test ebook",
        price: 4990,
        file_url: "https://example.com/ebook.pdf",
        slug: `test-ebook-${suffix}`,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.any(Number),
      name: "Test Ebook",
      price: 4990,
    });
    productId = res.body.data.id;
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Hack", price: 100, file_url: "https://example.com/f.pdf" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { message: "Admin access only" } });
  });

  it("should return 401 without token", async () => {
    const res = await request(app)
      .post("/products")
      .send({ name: "Hack", price: 100, file_url: "https://example.com/f.pdf" });

    expect(res.status).toBe(401);
  });

  it("should return 400 when name is missing", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 1000, file_url: "https://example.com/f.pdf" });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.name).toBeDefined();
  });

  it("should return 400 when price is missing", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "No Price", file_url: "https://example.com/f.pdf" });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.price).toBeDefined();
  });

  it("should return 400 when file_url is missing", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "No File", price: 1000 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.file_url).toBeDefined();
  });

  it("should return 400 for non-integer price", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bad Price", price: 9.99, file_url: "https://example.com/f.pdf" });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.price).toBeDefined();
  });
});

describe("GET /products", () => {
  it("should return all active products (public)", async () => {
    const res = await request(app).get("/products");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.any(Array));
  });
});

describe("GET /products/:id", () => {
  it("should return a product by id (public)", async () => {
    const res = await request(app).get(`/products/${productId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: productId,
      name: "Test Ebook",
    });
  });

  it("should return 404 for non-existent product", async () => {
    const res = await request(app).get("/products/999999");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Product not found" } });
  });
});

describe("PUT /products/:id", () => {
  it("should update a product as admin", async () => {
    const res = await request(app)
      .put(`/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Updated Ebook",
        price: 5990,
        file_url: "https://example.com/ebook-v2.pdf",
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: productId,
      name: "Updated Ebook",
      price: 5990,
    });
  });

  it("should return 404 for non-existent product", async () => {
    const res = await request(app)
      .put("/products/999999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Ghost", price: 1000, file_url: "https://example.com/f.pdf" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Product not found" } });
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .put(`/products/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Hacked", price: 1, file_url: "https://example.com/f.pdf" });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /products/:id", () => {
  it("should deactivate a product as admin", async () => {
    const res = await request(app)
      .delete(`/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("should return 404 after deactivation (not visible publicly)", async () => {
    const res = await request(app).get(`/products/${productId}`);

    expect(res.status).toBe(404);
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .delete(`/products/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });
});
