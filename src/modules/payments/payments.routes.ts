import express from "express";
import authenticate from "../../shared/middlewares/auth";
import type { PaymentsController } from "./payments.controller";

export function createPaymentsRoutes(controller: PaymentsController) {
  const router = express.Router();

  router.post("/checkout", authenticate, controller.checkout);

  // express.raw() captures the raw body needed for HMAC verification
  router.post("/webhook", express.raw({ type: "application/json" }), controller.webhook);

  return router;
}
