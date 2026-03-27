const errorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["message"],
      properties: { message: { type: "string" } },
    },
  },
} as const;

function dataResponse(schema: object) {
  return {
    type: "object",
    properties: { data: schema },
  };
}

const userSchema = {
  type: "object",
  required: ["id", "email", "name", "last_name", "role"],
  properties: {
    id: { type: "integer" },
    email: { type: "string", format: "email" },
    name: { type: "string" },
    last_name: { type: "string" },
    role: { type: "string", enum: ["customer", "admin"] },
    phone: { type: "string", nullable: true },
    tax_id: { type: "string", nullable: true },
    address: { type: "string", nullable: true },
    city: { type: "string", nullable: true },
    state: { type: "string", nullable: true },
    country: { type: "string", nullable: true },
    zip_code: { type: "string", nullable: true },
    created_at: { type: "string", format: "date-time" },
  },
};

const productSchema = {
  type: "object",
  required: ["id", "name", "price", "active"],
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    price: { type: "integer", description: "Price in cents" },
    category: { type: "string", nullable: true },
    image_url: { type: "string", nullable: true },
    slug: { type: "string", nullable: true },
    file_url: { type: "string", nullable: true },
    active: { type: "boolean" },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
};

const couponSchema = {
  type: "object",
  required: ["id", "code", "discount", "discount_type", "expires_at", "usage_limit", "current_usage", "active"],
  properties: {
    id: { type: "integer" },
    code: { type: "string" },
    discount: { type: "integer" },
    discount_type: { type: "string", enum: ["percentage", "fixed"] },
    min_order_value: { type: "integer", nullable: true },
    expires_at: { type: "string", format: "date-time" },
    usage_limit: { type: "integer" },
    current_usage: { type: "integer" },
    active: { type: "boolean" },
  },
};

const orderItemSchema = {
  type: "object",
  required: ["id", "product_id", "price"],
  properties: {
    id: { type: "integer" },
    product_id: { type: "integer" },
    price: { type: "integer" },
  },
};

const orderSchema = {
  type: "object",
  required: ["id", "status", "total", "created_at", "items"],
  properties: {
    id: { type: "integer" },
    status: { type: "string", enum: ["pending", "paid", "cancelled"] },
    total: { type: "integer", description: "Total in cents" },
    payment_id: { type: "string", nullable: true },
    coupon_id: { type: "integer", nullable: true },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
    items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
  },
};

const reviewSchema = {
  type: "object",
  required: ["id", "user_id", "product_id", "rating", "created_at"],
  properties: {
    id: { type: "integer" },
    user_id: { type: "integer" },
    product_id: { type: "integer" },
    rating: { type: "integer", minimum: 1, maximum: 5 },
    comment: { type: "string", nullable: true },
    created_at: { type: "string", format: "date-time" },
    user_name: { type: "string" },
    user_last_name: { type: "string" },
  },
};

function jsonContent(schema: object) {
  return { content: { "application/json": { schema } } };
}

function errorResponses(...codes: (400 | 401 | 403 | 404 | 409)[]) {
  return Object.fromEntries(
    codes.map((code) => [
      code,
      {
        description: {
          400: "Validation error",
          401: "Unauthorized",
          403: "Forbidden",
          404: "Not found",
          409: "Conflict",
        }[code],
        ...jsonContent({ $ref: "#/components/schemas/Error" }),
      },
    ]),
  );
}

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Digital Products API",
    version: "1.0.0",
    description: "REST API for a digital products e-commerce platform",
  },
  servers: [{ url: process.env.API_URL ?? "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: errorSchema,
      User: userSchema,
      Product: productSchema,
      Coupon: couponSchema,
      OrderItem: orderItemSchema,
      Order: orderSchema,
      Review: reviewSchema,
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        operationId: "register",
        summary: "Register a new user",
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["email", "password", "name", "last_name"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string", minLength: 6 },
              name: { type: "string" },
              last_name: { type: "string" },
              phone: { type: "string" },
              tax_id: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              country: { type: "string" },
              zip_code: { type: "string" },
            },
          }),
        },
        responses: {
          201: { description: "User registered", ...jsonContent(dataResponse({ $ref: "#/components/schemas/User" })) },
          ...errorResponses(400, 409),
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        operationId: "login",
        summary: "Login and receive a JWT token",
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string" },
            },
          }),
        },
        responses: {
          200: {
            description: "Login successful",
            ...jsonContent(
              dataResponse({
                type: "object",
                required: ["token", "user"],
                properties: {
                  token: { type: "string" },
                  user: { $ref: "#/components/schemas/User" },
                },
              }),
            ),
          },
          ...errorResponses(400, 401),
        },
      },
    },

    "/auth/verify-email": {
      post: {
        tags: ["Auth"],
        operationId: "sendVerificationEmail",
        summary: "Send a verification email",
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["email"],
            properties: {
              email: { type: "string", format: "email" },
            },
          }),
        },
        responses: {
          200: {
            description: "Verification email sent",
            ...jsonContent(dataResponse({ type: "object", properties: { message: { type: "string" } } })),
          },
          ...errorResponses(400),
        },
      },
    },

    "/auth/verify-email/{token}": {
      get: {
        tags: ["Auth"],
        operationId: "verifyEmail",
        summary: "Verify email using token",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Email verified successfully",
            ...jsonContent(dataResponse({ type: "object", properties: { message: { type: "string" } } })),
          },
          ...errorResponses(400),
        },
      },
    },

    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        operationId: "forgotPassword",
        summary: "Request a password reset link",
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["email"],
            properties: {
              email: { type: "string", format: "email" },
            },
          }),
        },
        responses: {
          200: {
            description: "Reset link sent if email exists",
            ...jsonContent(dataResponse({ type: "object", properties: { message: { type: "string" } } })),
          },
          ...errorResponses(400),
        },
      },
    },

    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        operationId: "resetPassword",
        summary: "Reset password using token",
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["token", "password"],
            properties: {
              token: { type: "string" },
              password: { type: "string", minLength: 6 },
            },
          }),
        },
        responses: {
          200: {
            description: "Password updated successfully",
            ...jsonContent(dataResponse({ type: "object", properties: { message: { type: "string" } } })),
          },
          ...errorResponses(400),
        },
      },
    },

    "/products": {
      get: {
        tags: ["Products"],
        operationId: "getProducts",
        summary: "List all active products",
        responses: {
          200: {
            description: "Product list",
            ...jsonContent(dataResponse({ type: "array", items: { $ref: "#/components/schemas/Product" } })),
          },
        },
      },
      post: {
        tags: ["Products"],
        operationId: "createProduct",
        summary: "Create a product (admin only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name", "price"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  price: { type: "integer", description: "Price in cents" },
                  category: { type: "string" },
                  image: { type: "string", format: "binary" },
                  slug: { type: "string" },
                  file_url: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Product created", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Product" })) },
          ...errorResponses(400, 401, 403),
        },
      },
    },

    "/products/{id}": {
      get: {
        tags: ["Products"],
        operationId: "getProductById",
        summary: "Get a product by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Product found", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Product" })) },
          ...errorResponses(404),
        },
      },
      put: {
        tags: ["Products"],
        operationId: "updateProduct",
        summary: "Update a product (admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name", "price"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  price: { type: "integer", description: "Price in cents" },
                  category: { type: "string" },
                  image: { type: "string", format: "binary" },
                  slug: { type: "string" },
                  file_url: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Product updated", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Product" })) },
          ...errorResponses(400, 401, 403, 404),
        },
      },
      delete: {
        tags: ["Products"],
        operationId: "deleteProduct",
        summary: "Deactivate a product (admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          204: { description: "Product deactivated" },
          ...errorResponses(401, 403, 404),
        },
      },
    },

    "/coupons": {
      get: {
        tags: ["Coupons"],
        operationId: "getCoupons",
        summary: "List all coupons (admin only)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Coupon list",
            ...jsonContent(dataResponse({ type: "array", items: { $ref: "#/components/schemas/Coupon" } })),
          },
          ...errorResponses(401, 403),
        },
      },
      post: {
        tags: ["Coupons"],
        operationId: "createCoupon",
        summary: "Create a coupon (admin only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["code", "discount", "expires_at", "usage_limit"],
            properties: {
              code: { type: "string" },
              discount: { type: "integer" },
              discount_type: { type: "string", enum: ["percentage", "fixed"], default: "percentage" },
              expires_at: { type: "string", format: "date-time" },
              usage_limit: { type: "integer" },
              min_order_value: { type: "integer" },
            },
          }),
        },
        responses: {
          201: { description: "Coupon created", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Coupon" })) },
          ...errorResponses(400, 401, 403, 409),
        },
      },
    },

    "/coupons/{code}": {
      get: {
        tags: ["Coupons"],
        operationId: "getCouponByCode",
        summary: "Get a coupon by code (public)",
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Coupon found", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Coupon" })) },
          ...errorResponses(404),
        },
      },
    },

    "/coupons/{id}": {
      put: {
        tags: ["Coupons"],
        operationId: "updateCoupon",
        summary: "Update a coupon (admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["code", "discount", "expires_at", "usage_limit"],
            properties: {
              code: { type: "string" },
              discount: { type: "integer" },
              discount_type: { type: "string", enum: ["percentage", "fixed"] },
              expires_at: { type: "string", format: "date-time" },
              usage_limit: { type: "integer" },
              min_order_value: { type: "integer" },
            },
          }),
        },
        responses: {
          200: { description: "Coupon updated", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Coupon" })) },
          ...errorResponses(400, 401, 403, 404),
        },
      },
      delete: {
        tags: ["Coupons"],
        operationId: "deactivateCoupon",
        summary: "Deactivate a coupon (admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          204: { description: "Coupon deactivated" },
          ...errorResponses(401, 403, 404),
        },
      },
    },

    "/orders": {
      post: {
        tags: ["Orders"],
        operationId: "createOrder",
        summary: "Create a new order",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["product_ids"],
            properties: {
              product_ids: { type: "array", items: { type: "integer" }, minItems: 1 },
              coupon_code: { type: "string" },
            },
          }),
        },
        responses: {
          201: { description: "Order created", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Order" })) },
          ...errorResponses(400, 401, 404),
        },
      },
      get: {
        tags: ["Orders"],
        operationId: "getOrders",
        summary: "List current user's orders",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Order list",
            ...jsonContent(dataResponse({ type: "array", items: { $ref: "#/components/schemas/Order" } })),
          },
          ...errorResponses(401),
        },
      },
    },

    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        operationId: "getOrderById",
        summary: "Get a specific order",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Order found", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Order" })) },
          ...errorResponses(401, 404),
        },
      },
    },

    "/payments/checkout": {
      post: {
        tags: ["Payments"],
        operationId: "createCheckout",
        summary: "Create an AbacatePay checkout for an order",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["order_id"],
            properties: { order_id: { type: "integer" } },
          }),
        },
        responses: {
          200: {
            description: "Checkout created",
            ...jsonContent(
              dataResponse({
                type: "object",
                properties: { checkout_url: { type: "string", format: "uri" } },
              }),
            ),
          },
          ...errorResponses(400, 401, 404),
        },
      },
    },

    "/payments/webhook": {
      post: {
        tags: ["Payments"],
        operationId: "paymentsWebhook",
        summary: "AbacatePay webhook endpoint",
        parameters: [
          { name: "webhookSecret", in: "query", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            properties: {
              event: { type: "string" },
              data: { type: "object" },
            },
          }),
        },
        responses: {
          200: { description: "Webhook processed" },
          ...errorResponses(400),
        },
      },
    },

    "/downloads/{token}": {
      get: {
        tags: ["Downloads"],
        operationId: "downloadFile",
        summary: "Redeem a download token and get the file URL",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "File URL",
            ...jsonContent(
              dataResponse({
                type: "object",
                properties: { file_url: { type: "string", format: "uri" } },
              }),
            ),
          },
          ...errorResponses(400, 404),
        },
      },
    },

    "/reviews": {
      post: {
        tags: ["Reviews"],
        operationId: "createReview",
        summary: "Submit a review (requires a paid order with the product)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["product_id", "rating"],
            properties: {
              product_id: { type: "integer" },
              rating: { type: "integer", minimum: 1, maximum: 5 },
              comment: { type: "string" },
            },
          }),
        },
        responses: {
          201: { description: "Review created", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Review" })) },
          ...errorResponses(400, 401, 403, 409),
        },
      },
    },

    "/reviews/product/{id}": {
      get: {
        tags: ["Reviews"],
        operationId: "getReviewsByProduct",
        summary: "List reviews for a product",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: {
            description: "Review list",
            ...jsonContent(dataResponse({ type: "array", items: { $ref: "#/components/schemas/Review" } })),
          },
        },
      },
    },

    "/admin/orders": {
      get: {
        tags: ["Admin"],
        operationId: "adminGetOrders",
        summary: "List all orders (admin only)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "All orders",
            ...jsonContent(dataResponse({ type: "array", items: { $ref: "#/components/schemas/Order" } })),
          },
          ...errorResponses(401, 403),
        },
      },
    },

    "/admin/orders/{id}/status": {
      put: {
        tags: ["Admin"],
        operationId: "adminUpdateOrderStatus",
        summary: "Update order status (admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          ...jsonContent({
            type: "object",
            required: ["status"],
            properties: {
              status: { type: "string", enum: ["pending", "paid", "cancelled"] },
            },
          }),
        },
        responses: {
          200: { description: "Order updated", ...jsonContent(dataResponse({ $ref: "#/components/schemas/Order" })) },
          ...errorResponses(400, 401, 403, 404),
        },
      },
    },

    "/admin/users": {
      get: {
        tags: ["Admin"],
        operationId: "adminGetUsers",
        summary: "List all users (admin only)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "All users",
            ...jsonContent(dataResponse({ type: "array", items: { $ref: "#/components/schemas/User" } })),
          },
          ...errorResponses(401, 403),
        },
      },
    },

    "/admin/products": {
      get: {
        tags: ["Admin"],
        operationId: "adminGetProducts",
        summary: "List all products including inactive (admin only)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "All products",
            ...jsonContent(dataResponse({ type: "array", items: { $ref: "#/components/schemas/Product" } })),
          },
          ...errorResponses(401, 403),
        },
      },
    },
  },
};
