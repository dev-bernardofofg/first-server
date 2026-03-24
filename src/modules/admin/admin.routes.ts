import express from "express";
import authenticate from "../../shared/middlewares/auth";
import requireAdmin from "../../shared/middlewares/role";
import upload from "../../shared/middlewares/upload";
import type { AdminController } from "./admin.controller";

export function createAdminRoutes(controller: AdminController) {
  const router = express.Router();

  router.use(authenticate, requireAdmin);

  router.get("/orders", controller.getAllOrders);
  router.put("/orders/:id/status", controller.updateOrderStatus);
  router.get("/users", controller.getAllUsers);
  router.get("/products", controller.getAllProducts);
  router.post("/upload-image", upload.single("image"), controller.uploadImage);

  return router;
}
