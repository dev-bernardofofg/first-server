# Project: Digital Products E-commerce

## Overview

REST API for selling digital products (templates, ebooks, courses).
The customer buys, pays via Stripe, and receives a temporary secure download link.

## Current Stack

- Node.js + Express (TypeScript)
- PostgreSQL (production on Railway)
- Zod 4 (validation)
- JWT + bcrypt (authentication)
- Vitest + Supertest (tests)
- tsx (TypeScript runner)

## Current Project Structure

```
first-server/
├── src/
│   ├── server.ts
│   ├── app.ts                        # composition root — wires DI
│   ├── database.ts
│   ├── modules/
│   │   ├── auth/                     # controller, service, routes
│   │   ├── contacts/                 # controller, service, repository, routes
│   │   └── products/                 # controller, service, repository, routes
│   ├── shared/
│   │   ├── errors/app-error.ts
│   │   ├── middlewares/              # auth, role, error
│   │   └── repositories/            # users.repository.ts
│   └── tests/
│       └── contacts.test.ts
├── markdown-helpers/
│   ├── initial.md
│   ├── conventions.md
│   └── architecture.md
├── tsconfig.json
└── package.json
```

---

## Database Schema

### Tables

```sql
-- Users (role: 'customer' or 'admin')
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contacts (base example from initial project)
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  last_name TEXT NOT NULL
);

-- Digital products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT,
  file_url TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Discount coupons
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount NUMERIC(5,2) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  usage_limit INTEGER NOT NULL,
  current_usage INTEGER DEFAULT 0
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  coupon_id INTEGER REFERENCES coupons(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | cancelled
  total NUMERIC(10,2) NOT NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) NOT NULL,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  download_token TEXT UNIQUE,
  token_expires_at TIMESTAMP,
  download_count INTEGER DEFAULT 0
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

## Planned Routes

### Auth (done)

| Method | Route          | Description     |
| ------ | -------------- | --------------- |
| POST   | /auth/register | Create new user |
| POST   | /auth/login    | Returns JWT     |

### Products (done)

| Method | Route         | Auth   | Description          |
| ------ | ------------- | ------ | -------------------- |
| GET    | /products     | Public | List active products |
| GET    | /products/:id | Public | Product detail       |
| POST   | /products     | Admin  | Create product       |
| PUT    | /products/:id | Admin  | Update product       |
| DELETE | /products/:id | Admin  | Deactivate product   |

### Orders

| Method | Route       | Auth     | Description                         |
| ------ | ----------- | -------- | ----------------------------------- |
| POST   | /orders     | Customer | Create order with items and coupon  |
| GET    | /orders     | Customer | List authenticated user's orders    |
| GET    | /orders/:id | Customer | Order detail                        |

### Payments (Stripe)

| Method | Route              | Auth     | Description                          |
| ------ | ------------------ | -------- | ------------------------------------ |
| POST   | /payments/checkout | Customer | Create Stripe checkout session       |
| POST   | /payments/webhook  | Public   | Receive Stripe event (payment done)  |

### Downloads

| Method | Route            | Auth   | Description                      |
| ------ | ---------------- | ------ | -------------------------------- |
| GET    | /downloads/:token | Public | Validate token and return file URL |

### Coupons

| Method | Route          | Auth     | Description                  |
| ------ | -------------- | -------- | ---------------------------- |
| POST   | /coupons       | Admin    | Create coupon                |
| GET    | /coupons/:code | Customer | Validate and return discount |

### Reviews

| Method | Route                  | Auth     | Description                        |
| ------ | ---------------------- | -------- | ---------------------------------- |
| POST   | /reviews               | Customer | Create review (buyers only)        |
| GET    | /reviews/product/:id   | Public   | List reviews for a product         |

---

## Business Rules

### Payment and Delivery

1. Customer creates order → receives Stripe checkout session
2. Customer pays on Stripe
3. Stripe calls webhook `/payments/webhook`
4. Backend confirms payment → changes order status to `paid`
5. Backend generates `download_token` with 24h expiration for each item
6. Customer accesses `/downloads/:token` to download the product

### Coupons

- Check if coupon hasn't expired (`expires_at > NOW()`)
- Check if usage is available (`current_usage < usage_limit`)
- Increment `current_usage` on payment confirmation (not on order creation)

### Reviews

- User can only review a product from an order with status `paid`
- Constraint `UNIQUE(user_id, product_id)` ensures one review per product

### Access Control (role)

- `admin` → can create/edit/delete products and coupons
- `customer` → can buy, review, and view own orders

---

## Implementation Order

1. ~~Migrate to TypeScript~~ ✅
2. ~~Database tables~~ ✅
3. ~~Role middleware (requireAdmin)~~ ✅
4. ~~Product routes (CRUD)~~ ✅
5. **Order routes** — create order with items and coupon
6. **Stripe integration** — checkout and webhook
7. **Download system** — token generation and validation
8. **Reviews** — with purchase verification
9. **Tests** — cover the full purchase flow

---

## Environment Variables

```
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=long_random_secret
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STORAGE_URL=your_storage_url  # for product files
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
