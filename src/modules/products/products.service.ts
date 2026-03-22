import { NotFoundError } from "../../shared/errors/app-error";
import type { ProductsRepository } from "./products.repository";

interface ProductInput {
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  slug?: string;
  file_url: string;
}

export class ProductsService {
  constructor(private productsRepository: ProductsRepository) {}

  async getAll() {
    return this.productsRepository.findAllActive();
  }

  async getById(id: number) {
    const product = await this.productsRepository.findActiveById(id);
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  async create(data: ProductInput) {
    return this.productsRepository.create({
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      category: data.category ?? null,
      image_url: data.image_url ?? null,
      slug: data.slug ?? null,
      file_url: data.file_url,
    });
  }

  async update(id: number, data: ProductInput) {
    const product = await this.productsRepository.update(id, {
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      category: data.category ?? null,
      image_url: data.image_url ?? null,
      slug: data.slug ?? null,
      file_url: data.file_url,
    });
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  async delete(id: number) {
    const product = await this.productsRepository.deactivate(id);
    if (!product) throw new NotFoundError("Product not found");
  }
}
