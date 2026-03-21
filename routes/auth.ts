import express from "express";
import bcrypt from "bcryptjs";
import db from "../database";
import { z } from "zod";
import jwt from "jsonwebtoken";

const router = express.Router();

const usuarioSchema = z.object({
  email: z.string({ error: "Email é obrigatório" }).email("Email inválido"),
  senha: z
    .string({ error: "Senha é obrigatória" })
    .min(6, "A senha deve ter no mínimo 6 caracteres"),
});

router.post("/registro", async (req, res, next) => {
  try {
    const result = usuarioSchema.safeParse(req.body);

    if (!result.success) {
      res
        .status(400)
        .json({ erros: z.flattenError(result.error).fieldErrors });
      return;
    }

    const { email, senha } = result.data;
    const hashedPassword = await bcrypt.hash(senha, 10);

    const {
      rows: [existingUser],
    } = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (existingUser) {
      res.status(400).json({ erro: "Email já registrado" });
      return;
    }

    const {
      rows: [created],
    } = await db.query(
      "INSERT INTO usuarios (email, senha) VALUES ($1, $2) RETURNING *",
      [email, hashedPassword],
    );

    res.status(201).json({ id: created.id, email });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const result = usuarioSchema.safeParse(req.body);
    if (!result.success) {
      res
        .status(400)
        .json({ erros: z.flattenError(result.error).fieldErrors });
      return;
    }
    const { email, senha } = result.data;

    const {
      rows: [user],
    } = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);

    if (!user) {
      res.status(400).json({ erro: "Email ou senha inválidos" });
      return;
    }

    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) {
      res.status(400).json({ erro: "Email ou senha inválidos" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );

    res.json({
      message: "Login realizado com sucesso",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
