import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface UserPayload {
  id: number;
  email: string;
  role: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: UserPayload;
  }
}

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Token not provided" } });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as UserPayload;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
}

export default authenticate;
