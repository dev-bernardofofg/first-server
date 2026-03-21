import "dotenv/config";
import express from "express";
import db from "./database";
import errorHandler from "./shared/middlewares/error";
import authenticate from "./shared/middlewares/auth";

// Repositories
import { UsersRepository } from "./shared/repositories/users.repository";
import { ContactsRepository } from "./modules/contacts/contacts.repository";
import { ProductsRepository } from "./modules/products/products.repository";

// Services
import { AuthService } from "./modules/auth/auth.service";
import { ContactsService } from "./modules/contacts/contacts.service";
import { ProductsService } from "./modules/products/products.service";

// Controllers
import { AuthController } from "./modules/auth/auth.controller";
import { ContactsController } from "./modules/contacts/contacts.controller";
import { ProductsController } from "./modules/products/products.controller";

// Routes
import { createAuthRoutes } from "./modules/auth/auth.routes";
import { createContactsRoutes } from "./modules/contacts/contacts.routes";
import { createProductsRoutes } from "./modules/products/products.routes";

// --- Dependency Injection ---

const usersRepository = new UsersRepository(db);
const contactsRepository = new ContactsRepository(db);
const productsRepository = new ProductsRepository(db);

const authService = new AuthService(usersRepository);
const contactsService = new ContactsService(contactsRepository);
const productsService = new ProductsService(productsRepository);

const authController = new AuthController(authService);
const contactsController = new ContactsController(contactsService);
const productsController = new ProductsController(productsService);

// --- App ---

const app = express();
app.use(express.json());

app.use("/auth", createAuthRoutes(authController));
app.use("/contacts", authenticate, createContactsRoutes(contactsController));
app.use("/products", createProductsRoutes(productsController));
app.use(errorHandler);

export default app;
