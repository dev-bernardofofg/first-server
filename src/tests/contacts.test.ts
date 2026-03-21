import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../app";

let token: string;
let contactId: number;

beforeAll(async () => {
  await request(app)
    .post("/auth/register")
    .send({ email: "test@test.com", password: "123456" });

  const res = await request(app)
    .post("/auth/login")
    .send({ email: "test@test.com", password: "123456" });

  token = res.body.data.token;
});

describe("POST /contacts", () => {
  it("should create a valid contact", async () => {
    const res = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bernardo", last_name: "Filipe" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: "Bernardo",
        last_name: "Filipe",
      }),
    );
    contactId = res.body.id;
  });

  it("should return error when creating contact without name", async () => {
    const res = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ last_name: "Filipe" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      errors: {
        name: ["Name is required"],
      },
    });
  });

  it("should return error when creating contact without last name", async () => {
    const res = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bernardo" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      errors: { last_name: ["Last name is required"] },
    });
  });

  it("should return error when sending request without token", async () => {
    const res = await request(app)
      .post("/contacts")
      .send({ name: "Bernardo", last_name: "Filipe" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Token not provided" });
  });
});

describe("GET /contacts", () => {
  it("should return all contacts", async () => {
    const res = await request(app)
      .get("/contacts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          last_name: expect.any(String),
        }),
      ]),
    );
  });
});

describe("PUT /contacts/:id", () => {
  it("should update a valid contact", async () => {
    const res = await request(app)
      .put(`/contacts/${contactId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bernardo", last_name: "Filipe" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(Number),
      name: "Bernardo",
      last_name: "Filipe",
    });
  });
});

describe("DELETE /contacts/:id", () => {
  it("should delete a valid contact", async () => {
    const res = await request(app)
      .delete(`/contacts/${contactId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it("should return error when deleting non-existent contact", async () => {
    const res = await request(app)
      .delete("/contacts/999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });
});

describe("GET /contacts/:id", () => {
  it("should return a valid contact", async () => {
    const created = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ana", last_name: "Silva" });

    const res = await request(app)
      .get(`/contacts/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: created.body.id,
      name: "Ana",
      last_name: "Silva",
    });
  });
});
