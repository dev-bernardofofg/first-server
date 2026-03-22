import express from "express";
import type { DownloadsController } from "./downloads.controller";

export function createDownloadsRoutes(controller: DownloadsController) {
  const router = express.Router();

  router.get("/:token", controller.download);

  return router;
}
