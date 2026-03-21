import type { Request, Response } from "express";
import { z } from "zod";
import type { ProductsService } from "./products.service";

const productSchema = z.object({
  name: z.string({ error: "Name is required" }).min(1, "Name is required"),
  description: z.string().optional(),
  price: z
    .number({ error: "Price is required" })
    .positive("Price must be greater than zero"),
  category: z.string().optional(),
  file_url: z
    .string({ error: "File URL is required" })
    .min(1, "File URL is required"),
});

export class ProductsController {
  constructor(private productsService: ProductsService) {}

  getAll = async (req: Request, res: Response) => {
    const products = await this.productsService.getAll();
    res.json(products);
  };

  getById = async (req: Request, res: Response) => {
    const product = await this.productsService.getById(Number(req.params.id));
    res.json(product);
  };

  create = async (req: Request, res: Response) => {
    const data = productSchema.parse(req.body);
    const product = await this.productsService.create(data);
    res.status(201).json(product);
  };

  update = async (req: Request, res: Response) => {
    const data = productSchema.parse(req.body);
    const product = await this.productsService.update(
      Number(req.params.id),
      data,
    );
    res.json(product);
  };

  delete = async (req: Request, res: Response) => {
    await this.productsService.delete(Number(req.params.id));
    res.status(204).send();
  };
}
