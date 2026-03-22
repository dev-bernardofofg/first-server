import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error";

function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: {
        message: "Validation failed",
        fields: z.flattenError(err).fieldErrors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: "Internal server error" } });
}

export default errorHandler;
