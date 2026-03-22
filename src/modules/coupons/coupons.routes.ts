import express from "express";
import authenticate from "../../shared/middlewares/auth";
import requireAdmin from "../../shared/middlewares/role";
import type { CouponsController } from "./coupons.controller";

export function createCouponsRoutes(controller: CouponsController) {
  const router = express.Router();

  // Public
  router.get("/:code", controller.getByCode);

  // Admin only
  router.get("/", authenticate, requireAdmin, controller.getAll);
  router.post("/", authenticate, requireAdmin, controller.create);
  router.put("/:id", authenticate, requireAdmin, controller.update);
  router.delete("/:id", authenticate, requireAdmin, controller.deactivate);

  return router;
}
