import type { Request, Response } from "express";
import { z } from "zod";
import type { OrdersService } from "./orders.service";

const idSchema = z.coerce.number().int().positive();

const createOrderSchema = z.object({
  product_ids: z
    .array(z.number().int().positive())
    .min(1, "At least one product is required"),
  coupon_code: z.string().optional(),
});

export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  create = async (req: Request, res: Response) => {
    const { product_ids, coupon_code } = createOrderSchema.parse(req.body);
    const order = await this.ordersService.create(
      req.user!.id,
      product_ids,
      coupon_code,
    );
    res.status(201).json({ data: order });
  };

  getAll = async (req: Request, res: Response) => {
    const orders = await this.ordersService.getAll(req.user!.id);
    res.json({ data: orders });
  };

  getById = async (req: Request, res: Response) => {
    const id = idSchema.parse(req.params.id);
    const order = await this.ordersService.getById(id, req.user!.id);
    res.json({ data: order });
  };
}
