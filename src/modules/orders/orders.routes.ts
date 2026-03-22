import express from "express";
import type { OrdersController } from "./orders.controller";

export function createOrdersRoutes(controller: OrdersController) {
  const router = express.Router();

  router.get("/", controller.getAll);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);

  return router;
}
