import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../index";

let token;
let contatoId;

beforeAll(async () => {
  await request(app)
    .post("/auth/registro")
    .send({ email: "teste@teste.com", senha: "123456" });

  const rest = await request(app)
    .post("/auth/login")
    .send({ email: "teste@teste.com", senha: "123456" });

  token = rest.body.data.token;
});

describe("POST /contatos", () => {
  it("deve criar um contato valido", async () => {
    // Arrange
    const res = await request(app)
      .post("/contatos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Bernardo", sobrenome: "Filipe" });
    // Act
    expect(res.status).toBe(201);
    // Assert
    expect(res.body).toEqual({
      id: expect.any(Number),
      nome: "Bernardo",
      sobrenome: "Filipe",
    });
    contatoId = res.body.id;
  });

  it("deve retornar erro ao criar um contato sem nome", async () => {
    // Arrange
    const res = await request(app)
      .post("/contatos")
      .set("Authorization", `Bearer ${token}`)
      .send({ sobrenome: "Filipe" });

    // Act
    expect(res.status).toBe(400);
    // Assert
    expect(res.body).toEqual({
      erros: {
        nome: ["Nome é obrigatório"],
      },
    });
  });

  it("deve retornar erro ao criar um contato sem sobrenome", async () => {
    // Arrange
    const res = await request(app)
      .post("/contatos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Bernardo" });

    // Act
    expect(res.status).toBe(400);
    // Assert
    expect(res.body).toEqual({
      erros: { sobrenome: ["Sobrenome é obrigatório"] },
    });
  });

  it("deve retornar erro ao enviar uma requisição sem token", async () => {
    // Arrange
    const res = await request(app)
      .post("/contatos")
      .send({ nome: "Bernardo", sobrenome: "Filipe" });

    // Act
    expect(res.status).toBe(401);
    // Assert
    expect(res.body).toEqual({ erro: "Token não fornecido" });
  });
});

describe("GET /contatos", () => {
  it("deve retornar todos os contatos", async () => {
    // Arrange
    const res = await request(app)
      .get("/contatos")
      .set("Authorization", `Bearer ${token}`);

    // Act
    expect(res.status).toBe(200);
    // Assert
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          nome: expect.any(String),
          sobrenome: expect.any(String),
        }),
      ]),
    );
  });
});

describe("PUT /contatos/:id", () => {
  it("deve atualizar um contato valido", async () => {
    // Arrange
    const res = await request(app)
      .put(`/contatos/${contatoId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Bernardo", sobrenome: "Filipe" });

    // Act
    expect(res.status).toBe(200);
    // Assert
    expect(res.body).toEqual({
      id: expect.any(Number),
      nome: "Bernardo",
      sobrenome: "Filipe",
    });
  });
});

describe("DELETE /contatos/:id", () => {
  it("deve deletar um contato valido", async () => {
    // Arrange
    const res = await request(app)
      .delete(`/contatos/${contatoId}`)
      .set("Authorization", `Bearer ${token}`);
    // Act
    expect(res.status).toBe(204);
    // Assert
    expect(res.body).toEqual({});
  });
});

describe("GET /contatos/:id", () => {
  it("deve retornar um contato valido", async () => {
    const res = await request(app)
      .get("/contatos/2")
      .set("Authorization", `Bearer ${token}`);
    // Act
    expect(res.status).toBe(200);
    // Assert
    expect(res.body).toEqual({
      id: expect.any(Number),
      nome: expect.any(String),
      sobrenome: expect.any(String),
    });
  });
});

describe("DELETE /contatos/:id", () => {
  it("deve retornar erro ao deletar um contato invalido", async () => {
    // Arrange
    const res = await request(app)
      .delete("/contatos/999")
      .set("Authorization", `Bearer ${token}`);
    // Act
    expect(res.status).toBe(404);
    // Assert
    expect(res.body).toEqual({ erro: "Não encontrado" });
  });
});
