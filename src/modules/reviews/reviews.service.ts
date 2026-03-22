import { ForbiddenError, ConflictError } from "../../shared/errors/app-error";
import type { ReviewsRepository } from "./reviews.repository";

interface CreateReviewData {
  userId: number;
  productId: number;
  rating: number;
  comment?: string;
}

export class ReviewsService {
  constructor(private reviewsRepository: ReviewsRepository) {}

  async create(data: CreateReviewData) {
    const hasPurchased = await this.reviewsRepository.hasPaidOrderWithProduct(
      data.userId,
      data.productId,
    );
    if (!hasPurchased) {
      throw new ForbiddenError("You can only review products you have purchased");
    }

    try {
      return await this.reviewsRepository.create({
        userId: data.userId,
        productId: data.productId,
        rating: data.rating,
        comment: data.comment ?? null,
      });
    } catch (err: any) {
      if (err.code === "23505") {
        throw new ConflictError("You have already reviewed this product");
      }
      throw err;
    }
  }

  async getByProduct(productId: number) {
    return this.reviewsRepository.findByProductId(productId);
  }
}
