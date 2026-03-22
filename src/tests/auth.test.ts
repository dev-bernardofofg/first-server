import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";

const suffix = Date.now();
const email = `auth-test-${suffix}@test.com`;
const password = "123456";

describe("POST /auth/register", () => {
  it("should register a new user", async () => {
    const res = await request(app).post("/auth/register").send({
      email,
      password,
      name: "Test",
      last_name: "User",
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.any(Number),
      email,
      name: "Test",
      last_name: "User",
    });
    expect(res.body.data.password).toBeUndefined();
  });

  it("should return 409 for duplicate email", async () => {
    const res = await request(app).post("/auth/register").send({
      email,
      password,
      name: "Test",
      last_name: "User",
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { message: "Email already registered" } });
  });

  it("should return 400 when email is missing", async () => {
    const res = await request(app).post("/auth/register").send({
      password,
      name: "Test",
      last_name: "User",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
    expect(res.body.error.fields.email).toBeDefined();
  });

  it("should return 400 when name is missing", async () => {
    const res = await request(app).post("/auth/register").send({
      email: `no-name-${suffix}@test.com`,
      password,
      last_name: "User",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.name).toBeDefined();
  });

  it("should return 400 when last_name is missing", async () => {
    const res = await request(app).post("/auth/register").send({
      email: `no-lastname-${suffix}@test.com`,
      password,
      name: "Test",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.last_name).toBeDefined();
  });

  it("should return 400 for invalid email format", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "not-an-email",
      password,
      name: "Test",
      last_name: "User",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.email).toBeDefined();
  });

  it("should return 400 for password shorter than 6 characters", async () => {
    const res = await request(app).post("/auth/register").send({
      email: `short-pass-${suffix}@test.com`,
      password: "123",
      name: "Test",
      last_name: "User",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.password).toBeDefined();
  });

  it("should accept optional profile fields", async () => {
    const res = await request(app).post("/auth/register").send({
      email: `with-profile-${suffix}@test.com`,
      password,
      name: "Test",
      last_name: "User",
      phone: "11999999999",
      address: "Rua das Flores, 123",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      zip_code: "01310-100",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });
});

describe("POST /auth/login", () => {
  it("should login and return a token", async () => {
    const res = await request(app).post("/auth/login").send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      token: expect.any(String),
      user: {
        id: expect.any(Number),
        email,
        name: "Test",
        role: "customer",
      },
    });
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app).post("/auth/login").send({ email, password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { message: "Invalid email or password" } });
  });

  it("should return 401 for non-existent email", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@test.com", password });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { message: "Invalid email or password" } });
  });

  it("should return 400 when email is missing", async () => {
    const res = await request(app).post("/auth/login").send({ password });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.email).toBeDefined();
  });

  it("should return 400 when password is missing", async () => {
    const res = await request(app).post("/auth/login").send({ email });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.password).toBeDefined();
  });
});
