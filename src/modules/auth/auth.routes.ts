import express from "express";
import type { AuthController } from "./auth.controller";

export function createAuthRoutes(controller: AuthController) {
  const router = express.Router();

  router.post("/register", controller.register);
  router.post("/login", controller.login);

  return router;
}
