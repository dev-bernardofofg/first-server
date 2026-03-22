import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../app";
import db from "../database";

let buyerToken: string;
let otherToken: string;
let productId: number;

const suffix = Date.now();

beforeAll(async () => {
  // Buyer user
  await request(app).post("/auth/register").send({
    email: `buyer-${suffix}@test.com`,
    password: "123456",
    name: "Buyer",
    last_name: "Test",
  });
  const buyerLogin = await request(app)
    .post("/auth/login")
    .send({ email: `buyer-${suffix}@test.com`, password: "123456" });
  buyerToken = buyerLogin.body.data.token;
  const buyerId = buyerLogin.body.data.user.id;

  // Other user (no purchase)
  await request(app).post("/auth/register").send({
    email: `other-${suffix}@test.com`,
    password: "123456",
    name: "Other",
    last_name: "Test",
  });
  const otherLogin = await request(app)
    .post("/auth/login")
    .send({ email: `other-${suffix}@test.com`, password: "123456" });
  otherToken = otherLogin.body.data.token;

  // Seed product
  const {
    rows: [product],
  } = await db.query(
    `INSERT INTO products (name, price, file_url) VALUES ($1, $2, $3) RETURNING *`,
    ["Review Test Product", 1000, "https://example.com/review-test.pdf"],
  );
  productId = product.id;

  // Seed a PAID order directly for the buyer
  const {
    rows: [order],
  } = await db.query(
    `INSERT INTO orders (user_id, total, status) VALUES ($1, $2, 'paid') RETURNING *`,
    [buyerId, 1000],
  );
  await db.query(
    `INSERT INTO order_items (order_id, product_id, price) VALUES ($1, $2, $3)`,
    [order.id, productId, 1000],
  );
});

describe("POST /reviews", () => {
  it("should create a review for a purchased product", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ product_id: productId, rating: 5, comment: "Excellent!" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.any(Number),
      product_id: productId,
      rating: 5,
      comment: "Excellent!",
    });
  });

  it("should return 409 for duplicate review", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ product_id: productId, rating: 3 });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { message: "You have already reviewed this product" } });
  });

  it("should return 403 when user has not purchased the product", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ product_id: productId, rating: 4 });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: { message: "You can only review products you have purchased" },
    });
  });

  it("should return 401 without token", async () => {
    const res = await request(app)
      .post("/reviews")
      .send({ product_id: productId, rating: 5 });

    expect(res.status).toBe(401);
  });

  it("should return 400 when product_id is missing", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.product_id).toBeDefined();
  });

  it("should return 400 for rating out of range", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ product_id: productId, rating: 6 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.rating).toBeDefined();
  });

  it("should create a review without comment", async () => {
    // Use a different product to avoid duplicate
    const {
      rows: [product2],
    } = await db.query(
      `INSERT INTO products (name, price, file_url) VALUES ($1, $2, $3) RETURNING *`,
      ["Review Test Product 2", 500, "https://example.com/review-test2.pdf"],
    );

    const buyerLogin = await request(app)
      .post("/auth/login")
      .send({ email: `buyer-${suffix}@test.com`, password: "123456" });
    const buyerId = buyerLogin.body.data.user.id;

    const {
      rows: [order],
    } = await db.query(
      `INSERT INTO orders (user_id, total, status) VALUES ($1, $2, 'paid') RETURNING *`,
      [buyerId, 500],
    );
    await db.query(
      `INSERT INTO order_items (order_id, product_id, price) VALUES ($1, $2, $3)`,
      [order.id, product2.id, 500],
    );

    const res = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ product_id: product2.id, rating: 4 });

    expect(res.status).toBe(201);
    expect(res.body.data.comment).toBeNull();
  });
});

describe("GET /reviews/product/:id", () => {
  it("should return reviews for a product (public)", async () => {
    const res = await request(app).get(`/reviews/product/${productId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          rating: 5,
          user: expect.objectContaining({ name: "Buyer" }),
        }),
      ]),
    );
  });

  it("should return empty array for a product with no reviews", async () => {
    const {
      rows: [product],
    } = await db.query(
      `INSERT INTO products (name, price, file_url) VALUES ($1, $2, $3) RETURNING *`,
      ["No Reviews Product", 500, "https://example.com/no-reviews.pdf"],
    );

    const res = await request(app).get(`/reviews/product/${product.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
