import express from "express";
import authenticate from "../../shared/middlewares/auth";
import requireAdmin from "../../shared/middlewares/role";
import upload from "../../shared/middlewares/upload";
import type { ProductsController } from "./products.controller";

export function createProductsRoutes(controller: ProductsController) {
  const router = express.Router();

  // Public
  router.get("/", controller.getAll);
  router.get("/:id", controller.getById);

  // Admin only
  router.post("/", authenticate, requireAdmin, upload.single("image"), controller.create);
  router.put("/:id", authenticate, requireAdmin, upload.single("image"), controller.update);
  router.delete("/:id", authenticate, requireAdmin, controller.delete);

  return router;
}
