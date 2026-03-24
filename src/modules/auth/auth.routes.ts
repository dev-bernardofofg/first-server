import express from "express";
import type { AuthController } from "./auth.controller";

export function createAuthRoutes(controller: AuthController) {
  const router = express.Router();

  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.post("/verify-email", controller.sendVerificationEmail);
  router.get("/verify-email/:token", controller.verifyEmail);

  return router;
}
