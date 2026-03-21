import express from "express";
import type { ContactsController } from "./contacts.controller";

export function createContactsRoutes(controller: ContactsController) {
  const router = express.Router();

  router.get("/", controller.getAll);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.delete);

  return router;
}
