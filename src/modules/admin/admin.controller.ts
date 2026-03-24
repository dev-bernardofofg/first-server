import type { Request, Response } from "express";
import { z } from "zod";
import { ValidationError } from "../../shared/errors/app-error";
import type { AdminService } from "./admin.service";

const idSchema = z.coerce.number().int().positive();

const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "cancelled"], {
    error: "Status must be pending, paid or cancelled",
  }),
});

export class AdminController {
  constructor(private adminService: AdminService) {}

  getAllOrders = async (req: Request, res: Response) => {
    const orders = await this.adminService.getAllOrders();
    res.json({ data: orders });
  };

  updateOrderStatus = async (req: Request, res: Response) => {
    const id = idSchema.parse(req.params.id);
    const { status } = updateOrderStatusSchema.parse(req.body);
    const order = await this.adminService.updateOrderStatus(id, status);
    res.json({ data: order });
  };

  getAllUsers = async (req: Request, res: Response) => {
    const users = await this.adminService.getAllUsers();
    res.json({ data: users });
  };

  getAllProducts = async (req: Request, res: Response) => {
    const products = await this.adminService.getAllProducts();
    res.json({ data: products });
  };

  uploadImage = async (req: Request, res: Response) => {
    if (!req.file) throw new ValidationError("No file provided");
    const result = await this.adminService.uploadProductImage(req.file);
    res.status(201).json({ data: result });
  };
}
