import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../app";
import db from "../database";

let adminToken: string;
let customerToken: string;
let couponId: number;

const suffix = Date.now();
const couponCode = `SAVE10_${suffix}`;

beforeAll(async () => {
  const hashedPassword = await bcrypt.hash("123456", 10);
  await db.query(
    `INSERT INTO users (email, password, role, name, last_name)
     VALUES ($1, $2, 'admin', 'Admin', 'Coupons')
     ON CONFLICT (email) DO NOTHING`,
    [`admin-coupons-${suffix}@test.com`, hashedPassword],
  );

  const adminLogin = await request(app)
    .post("/auth/login")
    .send({ email: `admin-coupons-${suffix}@test.com`, password: "123456" });
  adminToken = adminLogin.body.data.token;

  await request(app).post("/auth/register").send({
    email: `customer-coupons-${suffix}@test.com`,
    password: "123456",
    name: "Customer",
    last_name: "Coupons",
  });

  const customerLogin = await request(app)
    .post("/auth/login")
    .send({ email: `customer-coupons-${suffix}@test.com`, password: "123456" });
  customerToken = customerLogin.body.data.token;
});

describe("POST /coupons", () => {
  it("should create a coupon as admin", async () => {
    const res = await request(app)
      .post("/coupons")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: couponCode,
        discount: 10,
        discount_type: "percentage",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        usage_limit: 100,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.any(Number),
      code: couponCode,
      discount: 10,
    });
    couponId = res.body.data.id;
  });

  it("should return 409 for duplicate code", async () => {
    const res = await request(app)
      .post("/coupons")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: couponCode,
        discount: 5,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        usage_limit: 10,
      });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { message: "Coupon code already exists" } });
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .post("/coupons")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        code: `NOPE_${suffix}`,
        discount: 5,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        usage_limit: 10,
      });

    expect(res.status).toBe(403);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).post("/coupons").send({ code: "X", discount: 5, expires_at: new Date().toISOString(), usage_limit: 1 });
    expect(res.status).toBe(401);
  });

  it("should return 400 when code is missing", async () => {
    const res = await request(app)
      .post("/coupons")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ discount: 10, expires_at: new Date(Date.now() + 86400000).toISOString(), usage_limit: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.code).toBeDefined();
  });

  it("should return 400 for non-integer discount", async () => {
    const res = await request(app)
      .post("/coupons")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ code: `FRAC_${suffix}`, discount: 9.5, expires_at: new Date(Date.now() + 86400000).toISOString(), usage_limit: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.discount).toBeDefined();
  });

  it("should return 400 for invalid discount_type", async () => {
    const res = await request(app)
      .post("/coupons")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ code: `BADTYPE_${suffix}`, discount: 10, discount_type: "bogus", expires_at: new Date(Date.now() + 86400000).toISOString(), usage_limit: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.discount_type).toBeDefined();
  });
});

describe("GET /coupons", () => {
  it("should return all coupons as admin", async () => {
    const res = await request(app)
      .get("/coupons")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.any(Array));
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .get("/coupons")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/coupons");
    expect(res.status).toBe(401);
  });
});

describe("GET /coupons/:code", () => {
  it("should return coupon by code (public)", async () => {
    const res = await request(app).get(`/coupons/${couponCode}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ code: couponCode });
  });

  it("should return 404 for non-existent code", async () => {
    const res = await request(app).get("/coupons/DOESNOTEXIST");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Coupon not found" } });
  });
});

describe("PUT /coupons/:id", () => {
  it("should update a coupon as admin", async () => {
    const res = await request(app)
      .put(`/coupons/${couponId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: couponCode,
        discount: 20,
        discount_type: "percentage",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        usage_limit: 50,
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ discount: 20, usage_limit: 50 });
  });

  it("should return 404 for non-existent coupon", async () => {
    const res = await request(app)
      .put("/coupons/999999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: "GHOST",
        discount: 5,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        usage_limit: 1,
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Coupon not found" } });
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .put(`/coupons/${couponId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ code: "HACK", discount: 99, expires_at: new Date().toISOString(), usage_limit: 1 });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /coupons/:id", () => {
  it("should deactivate a coupon as admin", async () => {
    const res = await request(app)
      .delete(`/coupons/${couponId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("should return 404 for non-existent coupon", async () => {
    const res = await request(app)
      .delete("/coupons/999999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Coupon not found" } });
  });

  it("should return 403 for customer", async () => {
    const res = await request(app)
      .delete(`/coupons/${couponId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });
});
