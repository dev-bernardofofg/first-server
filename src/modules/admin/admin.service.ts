import type { Express } from "express";
import { NotFoundError, ValidationError } from "../../shared/errors/app-error";
import type { StorageService } from "../../shared/services/storage.service";
import type { OrdersRepository } from "../orders/orders.repository";
import type { UsersRepository } from "../../shared/repositories/users.repository";
import type { ProductsRepository } from "../products/products.repository";

const VALID_ORDER_STATUSES = ["pending", "paid", "cancelled"] as const;
type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

export class AdminService {
  constructor(
    private ordersRepository: OrdersRepository,
    private usersRepository: UsersRepository,
    private productsRepository: ProductsRepository,
    private storageService: StorageService,
  ) {}

  async getAllOrders() {
    return this.ordersRepository.findAll();
  }

  async updateOrderStatus(id: number, status: OrderStatus) {
    const order = await this.ordersRepository.updateStatus(id, status);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  }

  async getAllUsers() {
    return this.usersRepository.findAll();
  }

  async getAllProducts() {
    return this.productsRepository.findAll();
  }

  async uploadProductImage(file: Express.Multer.File) {
    const url = await this.storageService.uploadImage(file);
    return { url };
  }
}
