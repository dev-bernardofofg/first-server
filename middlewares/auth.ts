import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface UsuarioPayload {
  id: number;
  email: string;
}

declare module "express-serve-static-core" {
  interface Request {
    usuario?: UsuarioPayload;
  }
}

function autenticar(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token não fornecido" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as UsuarioPayload;
    req.usuario = payload;
    next();
  } catch (err) {
    res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

export default autenticar;
