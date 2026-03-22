# Code Conventions

## Language

All code must be written in **English**: variable names, function names, file names, database tables/columns, route paths, error messages, and comments.

---

## Folder Structure

```
first-server/
├── src/
│   ├── server.ts                     # starts the HTTP server
│   ├── app.ts                        # composition root — wires DI
│   ├── database.ts                   # PostgreSQL connection + table init
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.routes.ts
│   │   ├── contacts/
│   │   │   ├── contacts.controller.ts
│   │   │   ├── contacts.service.ts
│   │   │   ├── contacts.repository.ts
│   │   │   └── contacts.routes.ts
│   │   └── products/
│   │       ├── products.controller.ts
│   │       ├── products.service.ts
│   │       ├── products.repository.ts
│   │       └── products.routes.ts
│   ├── shared/
│   │   ├── errors/
│   │   │   └── app-error.ts          # AppError + custom error classes
│   │   ├── middlewares/
│   │   │   ├── auth.ts               # JWT verification
│   │   │   ├── role.ts               # requireAdmin
│   │   │   └── error.ts              # AppError + ZodError handler
│   │   └── repositories/
│   │       └── users.repository.ts   # shared across auth module
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

## Naming Conventions

### Files and Folders

- **kebab-case** for multi-word files: `order-items.ts`, `app-error.ts`
- Layered files use suffix: `users.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`
- One module per file — name matches the main export
- Tests mirror source: `contacts.controller.ts` → `tests/contacts.test.ts`

### Variables and Functions

- **camelCase** for variables and functions: `hashedPassword`, `authenticateToken`
- Descriptive names — avoid abbreviations: `user` not `usr`, `product` not `prod`
- Boolean variables start with `is`, `has`, `can`: `isMatch`, `hasExpired`

### Constants

- **UPPER_SNAKE_CASE** for true constants: `MAX_DOWNLOAD_ATTEMPTS`, `TOKEN_EXPIRY_HOURS`

### Types and Interfaces

- **PascalCase**: `UserPayload`, `ProductSchema`
- Interfaces describe shape, not implementation: `UserPayload` not `IUserPayload`

---

## Database

### Tables and Columns

- **snake_case** for tables and columns: `order_items`, `created_at`
- Table names are **plural**: `users`, `products`, `orders`
- Foreign keys follow `<singular_table>_id`: `user_id`, `product_id`

### Table Map (Portuguese → English)

| Old (PT)      | New (EN)      |
| ------------- | ------------- |
| usuarios      | users         |
| contatos      | contacts      |
| produtos      | products      |
| pedidos       | orders        |
| itens_pedido  | order_items   |
| cupons        | coupons       |
| avaliacoes    | reviews       |

### Column Map (Portuguese → English)

| Old (PT)              | New (EN)           |
| --------------------- | ------------------ |
| nome                  | name               |
| sobrenome             | last_name          |
| senha                 | password           |
| preco                 | price              |
| descricao             | description        |
| arquivo_url           | file_url           |
| ativo                 | active             |
| codigo                | code               |
| desconto              | discount           |
| validade              | expires_at         |
| limite_usos           | usage_limit        |
| usos_atuais           | current_usage      |
| nota                  | rating             |
| comentario            | comment            |
| downloads_realizados  | download_count     |
| token_expira_em       | token_expires_at   |

---

## Routes

- Paths in **English**, plural nouns: `/products`, `/orders`, `/reviews`
- RESTful naming — no verbs in paths

| Old (PT)         | New (EN)          |
| ---------------- | ----------------- |
| /auth/registro   | /auth/register    |
| /auth/login      | /auth/login       |
| /contatos        | /contacts         |
| /produtos        | /products         |
| /pedidos         | /orders           |
| /pagamentos      | /payments         |
| /avaliacoes      | /reviews          |
| /cupons          | /coupons          |

---

## Functions and Middlewares

| Old (PT)       | New (EN)        |
| -------------- | --------------- |
| autenticar     | authenticate    |
| exigirAdmin    | requireAdmin    |
| erroHandler    | errorHandler    |

---

## Error Messages

All error messages in **English**:

| Old (PT)                          | New (EN)                            |
| --------------------------------- | ----------------------------------- |
| Token não fornecido               | Token not provided                  |
| Token inválido ou expirado        | Invalid or expired token            |
| Email é obrigatório               | Email is required                   |
| Senha é obrigatória               | Password is required                |
| Email já registrado               | Email already registered            |
| Email ou senha inválidos          | Invalid email or password           |
| Não encontrado                    | Not found                           |
| Dados inválidos ou duplicados     | Invalid or duplicate data           |
| Erro interno do servidor          | Internal server error               |
| Acesso restrito a administradores | Admin access only                   |
| Nome é obrigatório                | Name is required                    |
| Sobrenome é obrigatório           | Last name is required               |

---

## Code Style

- **ESM imports** (`import/export`) — no CommonJS
- **Strict TypeScript** — `strict: true` in tsconfig
- **Zod** for all request body validation
- No `try/catch` in controllers — Express 5 catches async errors automatically and forwards to error middleware
- No `return res.json()` — use `res.json(); return;` (Express 5 + TS)
