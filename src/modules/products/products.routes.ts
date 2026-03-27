import express from "express";
import authenticate from "../../shared/middlewares/auth";
import requireAdmin from "../../shared/middlewares/role";
import type { ProductsController } from "./products.controller";

export function createProductsRoutes(controller: ProductsController) {
  const router = express.Router();

  // Public
  router.get("/", controller.getAll);
  router.get("/:id", controller.getById);

  // Admin only
  router.post("/", authenticate, requireAdmin, controller.create);
  router.put("/:id", authenticate, requireAdmin, controller.update);
  router.delete("/:id", authenticate, requireAdmin, controller.delete);

  return router;
}
