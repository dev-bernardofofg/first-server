import type { Request, Response } from "express";
import { z } from "zod";
import type { StorageService } from "../../shared/services/storage.service";
import type { ProductsService } from "./products.service";

const idSchema = z.coerce.number().int().positive();

const productSchema = z.object({
  name: z.string({ error: "Name is required" }).min(1, "Name is required"),
  description: z.string().optional(),
  price: z
    .number({ error: "Price is required" })
    .int("Price must be an integer in cents")
    .positive("Price must be greater than zero"),
  category: z.string().optional(),
  image_url: z.string().url("Invalid image URL").optional(),
  slug: z.string().min(1).optional(),
  file_url: z.string().min(1).optional(),
});

export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private storageService: StorageService,
  ) { }

  getAll = async (req: Request, res: Response) => {
    const products = await this.productsService.getAll();
    res.json({ data: products });
  };

  getById = async (req: Request, res: Response) => {
    const product = await this.productsService.getById(idSchema.parse(req.params.id));
    res.json({ data: product });
  };

  create = async (req: Request, res: Response) => {
    const data = productSchema.parse(req.body);
    if (req.file) {
      data.image_url = await this.storageService.uploadImage(req.file);
    }
    const product = await this.productsService.create(data);
    res.status(201).json({ data: product });
  };

  update = async (req: Request, res: Response) => {
    const data = productSchema.parse(req.body);
    if (req.file) {
      data.image_url = await this.storageService.uploadImage(req.file);
    }
    const product = await this.productsService.update(idSchema.parse(req.params.id), data);
    res.json({ data: product });
  };

  delete = async (req: Request, res: Response) => {
    await this.productsService.delete(idSchema.parse(req.params.id));
    res.status(204).send();
  };
}
