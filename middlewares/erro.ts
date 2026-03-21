import type { Request, Response, NextFunction } from "express";

function erroHandler(
  err: Error & { code?: string },
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.error(err);

  if (err.code === "SQLITE_CONSTRAINT") {
    res.status(400).json({ erro: "Dados inválidos ou duplicados" });
    return;
  }

  res.status(500).json({ erro: "Erro interno do servidor" });
}

export default erroHandler;
