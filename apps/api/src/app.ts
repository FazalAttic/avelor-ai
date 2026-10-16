import {
  type ChatModel,
  CompositeGuardrail,
  type EmbeddingModel,
  type GuardrailEngine,
  MockChatModel,
  type VectorStore,
} from "@avelor/ai";
import {
  type CartRepository,
  type CatalogRepository,
  InMemoryCartRepository,
  InMemoryCatalogRepository,
  InMemoryOrderRepository,
  InMemoryPolicyRepository,
  MockPaymentProvider,
  type OrderRepository,
  type PaymentProvider,
  type PolicyRepository,
  type TenantId,
} from "@avelor/core";
import { Hono } from "hono";
import { type AuthInstance, type AuthSession, type AuthUser, createAuth } from "./auth";
import { createAuthMiddleware } from "./middleware/auth";
import { createAdminRoutes } from "./routes/admin";
import { createCartRoutes } from "./routes/cart";
import { createCatalogRoutes } from "./routes/catalog";
import { createChatRoutes } from "./routes/chat";
import { createOrderRoutes } from "./routes/orders";
import { createPaymentRoutes } from "./routes/payments";

export type AppEnv = {
  Variables: {
    requestId: string;
    tenantId: TenantId;
    user?: AuthUser | undefined;
    session?: AuthSession | undefined;
  };
};

export interface AppOptions {
  readonly catalogRepo?: CatalogRepository | undefined;
  readonly cartRepo?: CartRepository | undefined;
  readonly orderRepo?: OrderRepository | undefined;
  readonly policyRepo?: PolicyRepository | undefined;
  readonly paymentProvider?: PaymentProvider | undefined;
  readonly webhookSecret?: string | undefined;
  readonly chatModel?: ChatModel | undefined;
  readonly embeddingModel?: EmbeddingModel | undefined;
  readonly vectorStore?: VectorStore | undefined;
  readonly guardrail?: GuardrailEngine | undefined;
  readonly auth?: AuthInstance | undefined;
  readonly enforceAdminAuth?: boolean | undefined;
}

export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppEnv>();
  const catalogRepo = options.catalogRepo ?? new InMemoryCatalogRepository();
  const cartRepo = options.cartRepo ?? new InMemoryCartRepository();
  const orderRepo = options.orderRepo ?? new InMemoryOrderRepository();
  const policyRepo = options.policyRepo ?? new InMemoryPolicyRepository();
  const paymentProvider = options.paymentProvider ?? new MockPaymentProvider();
  const chatModel = options.chatModel ?? new MockChatModel();
  const guardrail = options.guardrail ?? new CompositeGuardrail();

  const auth = options.auth ?? createAuth();
  const authMiddleware = createAuthMiddleware(auth);

  // Request ID middleware
  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    await next();
  });

  // Better Auth handler for /api/auth/*
  app.on(["POST", "GET"], "/api/auth/**", (c) => {
    return auth.handler(c.req.raw);
  });

  // Health check endpoint
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount catalog routes (with optional admin auth enforcement)
  app.route(
    "/api/v1/products",
    createCatalogRoutes(catalogRepo, options.enforceAdminAuth ? authMiddleware : undefined)
  );

  // Mount admin dashboard, management, policy, and reindex routes (strictly locked to admin role)
  app.route(
    "/api/v1/admin",
    createAdminRoutes({
      orderRepo,
      catalogRepo,
      policyRepo,
      authMiddleware,
      embeddingModel: options.embeddingModel,
      vectorStore: options.vectorStore,
    })
  );

  // Mount cart routes
  app.route("/api/v1/carts", createCartRoutes(cartRepo, catalogRepo));

  // Mount order & checkout routes
  app.route("/api/v1/orders", createOrderRoutes(orderRepo, cartRepo, catalogRepo, paymentProvider));

  // Mount payment & webhook routes
  app.route(
    "/api/v1/payments",
    createPaymentRoutes({
      paymentProvider,
      orderRepo,
      catalogRepo,
      webhookSecret: options.webhookSecret,
    })
  );

  // Mount AI chat discovery routes with hybrid semantic vector search, policy RAG & guardrails
  app.route(
    "/api/v1/chat",
    createChatRoutes(chatModel, catalogRepo, {
      embeddingModel: options.embeddingModel,
      vectorStore: options.vectorStore,
      policyRepo,
      guardrail,
    })
  );

  // Structured not-found handler
  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "The requested route does not exist",
        },
      },
      404
    );
  });

  // Global structured error handler
  app.onError((err, c) => {
    const isDev = process.env.NODE_ENV !== "production";
    return c.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: isDev ? err.message : "An unexpected error occurred",
        },
      },
      500
    );
  });

  return app;
}
