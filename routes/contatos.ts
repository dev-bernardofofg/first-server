import express from "express";
import db from "../database";
import { z } from "zod";

const router = express.Router();

const contatoSchema = z.object({
  nome: z.string({ error: "Nome é obrigatório" }).min(1, "Nome é obrigatório"),
  sobrenome: z
    .string({ error: "Sobrenome é obrigatório" })
    .min(1, "Sobrenome é obrigatório"),
});

router.get("/", async (req, res, next) => {
  try {
    const { rows: contatos } = await db.query("SELECT * FROM contatos");
    res.json(contatos);
  } catch (error) {
    next(error);
  }
});

// GET — busca um pelo id
router.get("/:id", async (req, res, next) => {
  try {
    const {
      rows: [contato],
    } = await db.query("SELECT * FROM contatos WHERE id = $1", [req.params.id]);
    if (!contato) {
      res.status(404).json({ erro: "Não encontrado" });
      return;
    }
    res.json(contato).status(200);
  } catch (error) {
    next(error);
  }
});

// POST — cria novo
router.post("/", async (req, res, next) => {
  try {
    const result = contatoSchema.safeParse(req.body);

    if (!result.success) {
      res
        .status(400)
        .json({ erros: z.flattenError(result.error).fieldErrors });
      return;
    }

    const { nome, sobrenome } = result.data;

    const {
      rows: [inserted],
    } = await db.query(
      "INSERT INTO contatos (nome, sobrenome) VALUES ($1, $2) RETURNING *",
      [nome, sobrenome],
    );

    res.status(201).json({ id: inserted.id, nome, sobrenome });
  } catch (error) {
    next(error);
  }
});

// PUT — atualiza um existente
router.put("/:id", async (req, res, next) => {
  try {
    const result = contatoSchema.safeParse(req.body);

    if (!result.success) {
      res
        .status(400)
        .json({ erros: z.flattenError(result.error).fieldErrors });
      return;
    }

    const { nome, sobrenome } = result.data;

    const {
      rows: [updated],
    } = await db.query(
      "UPDATE contatos SET nome = $1, sobrenome = $2 WHERE id = $3 RETURNING *",
      [nome, sobrenome, req.params.id],
    );

    if (!updated) {
      res.status(404).json({ erro: "Não encontrado" });
      return;
    }

    res.json({ id: updated.id, nome, sobrenome });
  } catch (error) {
    next(error);
  }
});

// DELETE — remove
router.delete("/:id", async (req, res, next) => {
  try {
    const {
      rows: [deleted],
    } = await db.query("DELETE FROM contatos WHERE id = $1 RETURNING *", [
      Number(req.params.id),
    ]);

    if (!deleted) {
      res.status(404).json({ erro: "Não encontrado" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
