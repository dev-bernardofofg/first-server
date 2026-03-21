import type { Request, Response, NextFunction } from "express";

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access only" });
    return;
  }

  next();
}

export default requireAdmin;
