import type { Request, Response } from "express";
import { z } from "zod";
import type { CouponsService } from "./coupons.service";

const idSchema = z.coerce.number().int().positive();

const couponSchema = z.object({
  code: z.string({ error: "Code is required" }).min(1, "Code is required"),
  discount: z
    .number({ error: "Discount is required" })
    .int("Discount must be an integer")
    .positive("Discount must be positive"),
  discount_type: z.enum(["percentage", "fixed"]).default("percentage"),
  expires_at: z.coerce.date({ error: "Invalid expiry date" }),
  usage_limit: z
    .number({ error: "Usage limit is required" })
    .int("Usage limit must be an integer")
    .positive("Usage limit must be positive"),
  min_order_value: z.number().int().positive().optional(),
});

export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  getAll = async (req: Request, res: Response) => {
    const coupons = await this.couponsService.getAll();
    res.json({ data: coupons });
  };

  getByCode = async (req: Request, res: Response) => {
    const coupon = await this.couponsService.getByCode(String(req.params.code));
    res.json({ data: coupon });
  };

  create = async (req: Request, res: Response) => {
    const data = couponSchema.parse(req.body);
    const coupon = await this.couponsService.create(data);
    res.status(201).json({ data: coupon });
  };

  update = async (req: Request, res: Response) => {
    const data = couponSchema.parse(req.body);
    const coupon = await this.couponsService.update(idSchema.parse(req.params.id), data);
    res.json({ data: coupon });
  };

  deactivate = async (req: Request, res: Response) => {
    await this.couponsService.deactivate(idSchema.parse(req.params.id));
    res.status(204).send();
  };
}
