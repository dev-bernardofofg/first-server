import "dotenv/config";
import express from "express";
import db from "./database";
import errorHandler from "./shared/middlewares/error";
import authenticate from "./shared/middlewares/auth";

// Repositories
import { UsersRepository } from "./shared/repositories/users.repository";
import { ProductsRepository } from "./modules/products/products.repository";
import { CouponsRepository } from "./modules/coupons/coupons.repository";
import { OrdersRepository } from "./modules/orders/orders.repository";

// Services
import { AuthService } from "./modules/auth/auth.service";
import { ProductsService } from "./modules/products/products.service";
import { CouponsService } from "./modules/coupons/coupons.service";
import { OrdersService } from "./modules/orders/orders.service";
import { AdminService } from "./modules/admin/admin.service";

// Controllers
import { AuthController } from "./modules/auth/auth.controller";
import { ProductsController } from "./modules/products/products.controller";
import { CouponsController } from "./modules/coupons/coupons.controller";
import { OrdersController } from "./modules/orders/orders.controller";
import { AdminController } from "./modules/admin/admin.controller";

// Routes
import { createAuthRoutes } from "./modules/auth/auth.routes";
import { createProductsRoutes } from "./modules/products/products.routes";
import { createCouponsRoutes } from "./modules/coupons/coupons.routes";
import { createOrdersRoutes } from "./modules/orders/orders.routes";
import { createAdminRoutes } from "./modules/admin/admin.routes";

// --- Dependency Injection ---

const usersRepository = new UsersRepository(db);
const productsRepository = new ProductsRepository(db);
const couponsRepository = new CouponsRepository(db);
const ordersRepository = new OrdersRepository(db);

const authService = new AuthService(usersRepository);
const productsService = new ProductsService(productsRepository);
const couponsService = new CouponsService(couponsRepository);
const ordersService = new OrdersService(ordersRepository, productsRepository, couponsRepository);
const adminService = new AdminService(ordersRepository, usersRepository, productsRepository);

const authController = new AuthController(authService);
const productsController = new ProductsController(productsService);
const couponsController = new CouponsController(couponsService);
const ordersController = new OrdersController(ordersService);
const adminController = new AdminController(adminService);

// --- App ---

const app = express();
app.use(express.json());

app.use("/auth", createAuthRoutes(authController));
app.use("/products", createProductsRoutes(productsController));
app.use("/coupons", createCouponsRoutes(couponsController));
app.use("/orders", authenticate, createOrdersRoutes(ordersController));
app.use("/admin", createAdminRoutes(adminController));
app.use(errorHandler);

export default app;
