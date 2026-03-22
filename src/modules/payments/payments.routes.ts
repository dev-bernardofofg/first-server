import express from "express";
import authenticate from "../../shared/middlewares/auth";

import type { PaymentsController } from "./payments.controller";

export function createPaymentsRoutes(controller: PaymentsController) {
  const router = express.Router();

  router.post("/checkout", authenticate, controller.checkout);

  router.post("/webhook", controller.webhook);

  return router;
}
