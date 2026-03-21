# Architecture: Layered + Repository Pattern + DI

## Overview

The project follows a **layered architecture** where each layer has a single responsibility and only communicates with the layer directly below it.

```
Request
  │
  ▼
┌─────────────┐
│  Middleware  │  auth, role, error handling
└──────┬──────┘
       ▼
┌─────────────┐
│   Routes    │  HTTP method + path → controller method
└──────┬──────┘
       ▼
┌─────────────┐
│ Controllers │  validate input (Zod), call service, format HTTP response
└──────┬──────┘
       ▼
┌─────────────┐
│  Services   │  business logic, orchestration, rules
└──────┬──────┘
       ▼
┌─────────────┐
│Repositories │  SQL queries, direct database access
└──────┬──────┘
       ▼
   [Database]
```

---

## Layers

### 1. Routes

Define HTTP endpoints and wire them to controller methods + middleware.
No logic here — just mapping.

```typescript
// routes/contacts.routes.ts
router.get("/", controller.getAll);
router.post("/", controller.create);
```

**Rules:**
- No `req.body` access
- No database calls
- No business logic
- Just `router.method(path, ...middlewares, controller.method)`

---

### 2. Controllers

Handle the HTTP layer: validate input, call the service, and send the response.

```typescript
// controllers/contacts.controller.ts
class ContactsController {
  constructor(private contactsService: ContactsService) {}

  create = async (req: Request, res: Response) => {
    const data = contactSchema.parse(req.body); // Zod throws on invalid
    const contact = await this.contactsService.create(data);
    res.status(201).json(contact);
  };
}
```

**Rules:**
- Validates input with Zod (using `.parse()` which throws — caught by error middleware)
- Calls service methods with validated data
- Formats HTTP responses (status codes, JSON)
- Never contains SQL or business rules

---

### 3. Services

Contain all **business logic**. Orchestrate calls to one or more repositories.

```typescript
// services/auth.service.ts
class AuthService {
  constructor(private usersRepository: UsersRepository) {}

  async register(email: string, password: string) {
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) throw new ConflictError("Email already registered");

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.usersRepository.create(email, hashedPassword);
  }
}
```

**Rules:**
- No `req`/`res` — completely unaware of HTTP
- No SQL — delegates to repositories
- Throws custom errors (`NotFoundError`, `ConflictError`, etc.)
- Contains validation rules, transformations, orchestration

---

### 4. Repositories

Direct database access. One repository per table/entity.

```typescript
// repositories/users.repository.ts
class UsersRepository {
  constructor(private db: Pool) {}

  async findByEmail(email: string) {
    const { rows: [user] } = await this.db.query(
      "SELECT * FROM users WHERE email = $1", [email]
    );
    return user ?? null;
  }
}
```

**Rules:**
- Only SQL queries, nothing else
- Returns raw data (rows) or null
- No business logic, no HTTP, no validation
- Receives `db: Pool` via constructor injection

---

## Dependency Injection (Manual)

Dependencies flow **downward** via constructor injection. No DI framework — just plain constructors wired in the composition root (`app.ts`).

```
db (Pool)
  └─→ UsersRepository(db)
        └─→ AuthService(usersRepository)
              └─→ AuthController(authService)
                    └─→ createAuthRoutes(authController)
```

### Composition Root — `app.ts`

```typescript
// 1. Database
import db from "./database";

// 2. Repositories
const usersRepository = new UsersRepository(db);
const contactsRepository = new ContactsRepository(db);

// 3. Services
const authService = new AuthService(usersRepository);
const contactsService = new ContactsService(contactsRepository);

// 4. Controllers
const authController = new AuthController(authService);
const contactsController = new ContactsController(contactsService);

// 5. Routes
app.use("/auth", createAuthRoutes(authController));
app.use("/contacts", authenticate, createContactsRoutes(contactsController));
```

### Why manual DI?

- Transparent: you see exactly what depends on what
- No magic decorators or reflection
- Easy to test: swap real repositories for mocks
- Good enough for this project's size

---

## Error Handling

### Custom Error Classes

```typescript
// errors/app-error.ts
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, message);
  }
}
```

### Error Flow

1. **Repository** → returns `null` if not found (no throwing)
2. **Service** → checks null, throws `NotFoundError`
3. **Controller** → Zod `.parse()` throws `ZodError` on invalid input
4. **Express 5** → catches rejected promises automatically (no try/catch needed!)
5. **Error middleware** → maps error type to HTTP response

```
Zod throws ZodError ──────┐
Service throws AppError ──┤
Unexpected error ─────────┤
                          ▼
                  ┌──────────────┐
                  │ errorHandler │ → maps to { statusCode, json }
                  └──────────────┘
```

### Express 5 Async Handling

Express 5 natively catches async errors — if an `async` handler throws or returns a rejected promise, it's automatically forwarded to the error middleware. This means **no try/catch in controllers**:

```typescript
// Express 5 — this just works:
create = async (req: Request, res: Response) => {
  const data = contactSchema.parse(req.body);       // throws ZodError if invalid
  const contact = await this.service.create(data);   // throws AppError if fails
  res.status(201).json(contact);
  // no try/catch needed — Express 5 handles it
};
```

---

## Folder Structure

```
first-server/
├── src/
│   ├── server.ts
│   ├── app.ts                            # composition root — wires DI
│   ├── database.ts
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
│   │   │   └── app-error.ts
│   │   ├── middlewares/
│   │   │   ├── auth.ts
│   │   │   ├── role.ts
│   │   │   └── error.ts
│   │   └── repositories/
│   │       └── users.repository.ts
│   └── tests/
│       └── contacts.test.ts
├── markdown-helpers/
└── tsconfig.json
```

---

## Naming Conventions (per layer)

| Layer      | File naming               | Class naming          | Method examples                    |
| ---------- | ------------------------- | --------------------- | ---------------------------------- |
| Repository | `users.repository.ts`     | `UsersRepository`     | `findAll`, `findById`, `create`    |
| Service    | `auth.service.ts`         | `AuthService`         | `register`, `login`, `getAll`      |
| Controller | `auth.controller.ts`      | `AuthController`      | `register`, `login`, `getAll`      |
| Route      | `auth.routes.ts`          | (function)            | `createAuthRoutes(controller)`     |
| Error      | `app-error.ts`            | `AppError`            | —                                  |

---

## Testing with DI

Because dependencies are injected, testing is straightforward:

```typescript
// Unit test — mock the repository
const mockRepo = { findAll: vi.fn().mockResolvedValue([{ id: 1, name: "Test" }]) };
const service = new ContactsService(mockRepo as any);
const result = await service.getAll();
expect(result).toHaveLength(1);
```

```typescript
// Integration test — use the real app (tests/contacts.test.ts)
// The app.ts wires everything with real db, tests hit real endpoints
const res = await request(app).get("/contacts");
```
