# Project: Digital Products E-commerce

## Overview

REST API for selling digital products (templates, ebooks, courses).
The customer buys, pays via Stripe, and receives a temporary secure download link.

## Current Stack

- Node.js + Express 5 (TypeScript)
- PostgreSQL (production on Railway)
- Zod 4 (validation)
- JWT + bcrypt (authentication)
- Vitest + Supertest (integration tests)
- tsx (TypeScript runner)

## Current Project Structure

```
first-server/
├── src/
│   ├── server.ts
│   ├── app.ts                        # composition root — wires DI
│   ├── database.ts                   # pool + CREATE TABLE IF NOT EXISTS (all tables)
│   ├── modules/
│   │   ├── auth/                     # controller, service, routes
│   │   ├── products/                 # controller, service, repository, routes
│   │   ├── orders/                   # controller, service, repository, routes
│   │   ├── coupons/                  # controller, service, repository, routes
│   │   └── admin/                    # controller, service, routes
│   ├── shared/
│   │   ├── errors/app-error.ts
│   │   ├── middlewares/              # auth.ts, role.ts, error.ts
│   │   └── repositories/            # users.repository.ts
│   ├── scripts/
│   │   └── seed-admin.ts             # npm run seed:admin
│   └── tests/
│       ├── auth.test.ts
│       ├── products.test.ts
│       ├── orders.test.ts
│       ├── coupons.test.ts
│       └── admin.test.ts
├── markdown-helpers/
│   ├── initial.md
│   ├── conventions.md
│   └── architecture.md
├── tsconfig.json
└── package.json
```

---

## Database Schema

All monetary values are **integers in cents** (e.g., R$49.90 = `4990`). The frontend handles display formatting.

```sql
-- Users (role: 'customer' or 'admin')
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  zip_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Digital products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category TEXT,
  image_url TEXT,
  slug TEXT UNIQUE,
  file_url TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Discount coupons
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount INTEGER NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  min_order_value INTEGER,
  expires_at TIMESTAMP NOT NULL,
  usage_limit INTEGER NOT NULL,
  current_usage INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  coupon_id INTEGER REFERENCES coupons(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | cancelled
  total INTEGER NOT NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) NOT NULL,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  price INTEGER NOT NULL,
  download_token TEXT UNIQUE,
  token_expires_at TIMESTAMP,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

---

## Implemented Routes

### Auth

| Method | Route          | Auth   | Description            |
| ------ | -------------- | ------ | ---------------------- |
| POST   | /auth/register | Public | Register (role=customer) |
| POST   | /auth/login    | Public | Returns JWT            |

### Products

| Method | Route         | Auth   | Description          |
| ------ | ------------- | ------ | -------------------- |
| GET    | /products     | Public | List active products |
| GET    | /products/:id | Public | Product detail       |
| POST   | /products     | Admin  | Create product       |
| PUT    | /products/:id | Admin  | Update product       |
| DELETE | /products/:id | Admin  | Deactivate product   |

### Orders

| Method | Route       | Auth     | Description                        |
| ------ | ----------- | -------- | ---------------------------------- |
| POST   | /orders     | Customer | Create order with items and coupon |
| GET    | /orders     | Customer | List authenticated user's orders   |
| GET    | /orders/:id | Customer | Order detail with items            |

### Coupons

| Method | Route          | Auth   | Description                          |
| ------ | -------------- | ------ | ------------------------------------ |
| GET    | /coupons/:code | Public | Validate coupon and return details   |
| GET    | /coupons       | Admin  | List all coupons                     |
| POST   | /coupons       | Admin  | Create coupon                        |
| PUT    | /coupons/:id   | Admin  | Update coupon                        |
| DELETE | /coupons/:id   | Admin  | Deactivate coupon                    |

### Admin Backoffice

| Method | Route                    | Auth  | Description                    |
| ------ | ------------------------ | ----- | ------------------------------ |
| GET    | /admin/orders            | Admin | List all orders (with user)    |
| PUT    | /admin/orders/:id/status | Admin | Update order status            |
| GET    | /admin/users             | Admin | List all users (no password)   |
| GET    | /admin/products          | Admin | List all products (incl. inactive) |

---

## Pending Routes

### Payments (Stripe — last)

| Method | Route              | Auth     | Description                         |
| ------ | ------------------ | -------- | ----------------------------------- |
| POST   | /payments/checkout | Customer | Create Stripe checkout session      |
| POST   | /payments/webhook  | Public   | Receive Stripe event (payment done) |

### Downloads

| Method | Route             | Auth   | Description                        |
| ------ | ----------------- | ------ | ---------------------------------- |
| GET    | /downloads/:token | Public | Validate token and return file URL |

### Reviews

| Method | Route                | Auth     | Description                 |
| ------ | -------------------- | -------- | --------------------------- |
| POST   | /reviews             | Customer | Create review (buyers only) |
| GET    | /reviews/product/:id | Public   | List reviews for a product  |

---

## Business Rules

### Order Creation

1. Customer sends `product_ids[]` and optional `coupon_code`
2. All products must exist and be active
3. Coupon (if provided) must be: active, not expired, not exhausted, meet `min_order_value`
4. `discount_type: 'percentage'` — total = round(subtotal × (1 - discount/100))
5. `discount_type: 'fixed'` — total = max(0, subtotal - discount)
6. Order is created atomically (transaction): order + order_items in one query

### Payment and Delivery

1. Customer creates order → receives Stripe checkout session
2. Customer pays on Stripe
3. Stripe calls webhook `/payments/webhook`
4. Backend confirms payment → changes order status to `paid`
5. Backend generates `download_token` with 24h expiration for each item
6. Customer accesses `/downloads/:token` to download the product

### Coupons

- Checked at order creation (active, not expired, not exhausted, min_order_value)
- `current_usage` is incremented on payment confirmation (webhook), not on order creation

### Reviews

- User can only review a product from an order with status `paid`
- Constraint `UNIQUE(user_id, product_id)` ensures one review per product

### Access Control (role)

- `admin` → backoffice access + product/coupon management
- `customer` → can buy, review, and view own orders
- Admin users are created via `npm run seed:admin` (reads from `.env`)

---

## Implementation Order

1. ~~Migrate to TypeScript~~ ✅
2. ~~Database tables~~ ✅
3. ~~Standardize API response format~~ ✅
4. ~~Role middleware (requireAdmin)~~ ✅
5. ~~Product routes (CRUD)~~ ✅
6. ~~Order routes (create + list + detail)~~ ✅
7. ~~Coupons module (admin CRUD + public validation)~~ ✅
8. ~~Admin backoffice (orders, users, products)~~ ✅
9. ~~Admin seed script (`npm run seed:admin`)~~ ✅
10. ~~Tests — auth, products, orders, coupons, admin~~ ✅
11. **Reviews** — POST /reviews + GET /reviews/product/:id
12. **Stripe integration** — checkout + webhook
13. **Download system** — token generation and validation

---

## Environment Variables

```
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=long_random_secret
NODE_ENV=development

# Admin seed
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strongpassword
ADMIN_NAME=Admin
ADMIN_LAST_NAME=User

# Stripe (pending)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Learning Context

This project was started to learn backend development from scratch.
The developer has frontend expertise (JS/TS) and is learning:

- REST API structure
- Relational databases (PostgreSQL)
- Authentication and security
- Automated testing
- Production deployment
- External service integration (Stripe)
