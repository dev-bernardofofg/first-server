import "dotenv/config";
import express from "express";
import cors from "cors";
import db from "./database";
import errorHandler from "./shared/middlewares/error";
import authenticate from "./shared/middlewares/auth";
import requestLogger from "./shared/middlewares/request-logger";

// Repositories
import { UsersRepository } from "./shared/repositories/users.repository";
import { ProductsRepository } from "./modules/products/products.repository";
import { CouponsRepository } from "./modules/coupons/coupons.repository";
import { OrdersRepository } from "./modules/orders/orders.repository";
import { ReviewsRepository } from "./modules/reviews/reviews.repository";
import { DownloadsRepository } from "./modules/downloads/downloads.repository";

// Shared Services
import { EmailService } from "./shared/services/email.service";
import { StorageService } from "./shared/services/storage.service";

// Services
import { AuthService } from "./modules/auth/auth.service";
import { ProductsService } from "./modules/products/products.service";
import { CouponsService } from "./modules/coupons/coupons.service";
import { OrdersService } from "./modules/orders/orders.service";
import { AdminService } from "./modules/admin/admin.service";
import { ReviewsService } from "./modules/reviews/reviews.service";
import { PaymentsService } from "./modules/payments/payments.service";
import { DownloadsService } from "./modules/downloads/downloads.service";

// Controllers
import { AuthController } from "./modules/auth/auth.controller";
import { ProductsController } from "./modules/products/products.controller";
import { CouponsController } from "./modules/coupons/coupons.controller";
import { OrdersController } from "./modules/orders/orders.controller";
import { AdminController } from "./modules/admin/admin.controller";
import { ReviewsController } from "./modules/reviews/reviews.controller";
import { PaymentsController } from "./modules/payments/payments.controller";
import { DownloadsController } from "./modules/downloads/downloads.controller";

// OpenAPI
import { openApiSpec } from "./openapi";

// Routes
import { createAuthRoutes } from "./modules/auth/auth.routes";
import { createProductsRoutes } from "./modules/products/products.routes";
import { createCouponsRoutes } from "./modules/coupons/coupons.routes";
import { createOrdersRoutes } from "./modules/orders/orders.routes";
import { createAdminRoutes } from "./modules/admin/admin.routes";
import { createReviewsRoutes } from "./modules/reviews/reviews.routes";
import { createPaymentsRoutes } from "./modules/payments/payments.routes";
import { createDownloadsRoutes } from "./modules/downloads/downloads.routes";

// --- Dependency Injection ---

const usersRepository = new UsersRepository(db);
const productsRepository = new ProductsRepository(db);
const couponsRepository = new CouponsRepository(db);
const ordersRepository = new OrdersRepository(db);
const reviewsRepository = new ReviewsRepository(db);
const downloadsRepository = new DownloadsRepository(db);

const emailService = new EmailService();
const storageService = new StorageService();

const authService = new AuthService(usersRepository, emailService);
const productsService = new ProductsService(productsRepository);
const couponsService = new CouponsService(couponsRepository);
const ordersService = new OrdersService(ordersRepository, productsRepository, couponsRepository);
const adminService = new AdminService(ordersRepository, usersRepository, productsRepository, storageService);
const reviewsService = new ReviewsService(reviewsRepository);
const paymentsService = new PaymentsService(ordersRepository, couponsRepository);
const downloadsService = new DownloadsService(downloadsRepository);

const authController = new AuthController(authService);
const productsController = new ProductsController(productsService);
const couponsController = new CouponsController(couponsService);
const ordersController = new OrdersController(ordersService);
const adminController = new AdminController(adminService);
const reviewsController = new ReviewsController(reviewsService);
const paymentsController = new PaymentsController(paymentsService);
const downloadsController = new DownloadsController(downloadsService);

// --- App ---

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(requestLogger);
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

app.get("/openapi.json", (_req, res) => res.json(openApiSpec));

app.use("/auth", createAuthRoutes(authController));
app.use("/products", createProductsRoutes(productsController));
app.use("/coupons", createCouponsRoutes(couponsController));
app.use("/orders", authenticate, createOrdersRoutes(ordersController));
app.use("/admin", createAdminRoutes(adminController));
app.use("/reviews", createReviewsRoutes(reviewsController));
app.use("/payments", createPaymentsRoutes(paymentsController));
app.use("/downloads", createDownloadsRoutes(downloadsController));
app.use(errorHandler);

export default app;
