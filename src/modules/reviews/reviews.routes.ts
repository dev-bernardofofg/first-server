import express from "express";
import authenticate from "../../shared/middlewares/auth";
import type { ReviewsController } from "./reviews.controller";

export function createReviewsRoutes(controller: ReviewsController) {
  const router = express.Router();

  router.post("/", authenticate, controller.create);
  router.get("/product/:id", controller.getByProduct);

  return router;
}
