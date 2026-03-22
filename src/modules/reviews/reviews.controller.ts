import type { Request, Response } from "express";
import { z } from "zod";
import type { ReviewsService } from "./reviews.service";

const idSchema = z.coerce.number().int().positive();

const createReviewSchema = z.object({
  product_id: z.number({ error: "product_id is required" }).int().positive(),
  rating: z
    .number({ error: "Rating is required" })
    .int("Rating must be an integer")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  comment: z.string().optional(),
});

export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  create = async (req: Request, res: Response) => {
    const { product_id, rating, comment } = createReviewSchema.parse(req.body);
    const review = await this.reviewsService.create({
      userId: req.user!.id,
      productId: product_id,
      rating,
      comment,
    });
    res.status(201).json({ data: review });
  };

  getByProduct = async (req: Request, res: Response) => {
    const productId = idSchema.parse(req.params.id);
    const reviews = await this.reviewsService.getByProduct(productId);
    res.json({ data: reviews });
  };
}
