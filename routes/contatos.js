const express = require("express");
const router = express.Router();
const db = require("../database");
const { default: z } = require("zod");

const contatoSchema = z.object({
  nome: z.string({ error: "Nome é obrigatório" }).min(1, "Nome é obrigatório"),
  sobrenome: z
    .string({ error: "Sobrenome é obrigatório" })
    .min(1, "Sobrenome é obrigatório"),
});

router.get("/", (req, res, next) => {
  try {
    const contatos = db.prepare("SELECT * FROM contatos").all();
    res.json(contatos);
  } catch (error) {
    next(error);
  }
});

// GET — busca um pelo id
router.get("/:id", (req, res, next) => {
  try {
    const contato = db
      .prepare("SELECT * FROM contatos WHERE id = ?")
      .get(Number(req.params.id));
    if (!contato) return res.status(404).json({ erro: "Não encontrado" });
    res.json(contato).status(200);
  } catch (error) {
    next(error);
  }
});

// POST — cria novo
router.post("/", (req, res, next) => {
  try {
    const result = contatoSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ erros: z.flattenError(result.error).fieldErrors });
    }

    const { nome, sobrenome } = result.data;

    const inserted = db
      .prepare("INSERT INTO contatos (nome, sobrenome) VALUES (?, ?)")
      .run(nome, sobrenome);

    return res
      .status(201)
      .json({ id: inserted.lastInsertRowid, nome, sobrenome });
  } catch (error) {
    next(error);
  }
});

// PUT — atualiza um existente
router.put("/:id", (req, res, next) => {
  try {
    const result = contatoSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ erros: z.flattenError(result.error).fieldErrors });
    }

    const { nome, sobrenome } = result.data;

    const updated = db
      .prepare("UPDATE contatos SET nome = ?, sobrenome = ? WHERE id = ?")
      .run(nome, sobrenome, Number(req.params.id));

    if (updated.changes === 0)
      return res.status(404).json({ erro: "Não encontrado" });

    res.json({ id: Number(req.params.id), nome, sobrenome });
  } catch (error) {
    next(error);
  }
});

// DELETE — remove
router.delete("/:id", (req, res, next) => {
  try {
    const deleted = db
      .prepare("DELETE FROM contatos WHERE id = ?")
      .run(Number(req.params.id));

    if (deleted.changes === 0)
      return res.status(404).json({ erro: "Não encontrado" });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
