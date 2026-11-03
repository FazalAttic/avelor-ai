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
  type ConversationRepository,
  type EmailService,
  InMemoryCartRepository,
  MockPaymentProvider,
  type OrderRepository,
  type PaymentProvider,
  type PolicyRepository,
  ResendEmailService,
  type TenantId,
} from "@avelor/core";
import {
  createDatabaseClient,
  type Database,
  DrizzleCatalogRepository,
  DrizzleConversationRepository,
  DrizzleOrderRepository,
  DrizzlePolicyRepository,
  PgVectorStore,
  type RedisTokenBucket,
} from "@avelor/database";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { type AuthInstance, type AuthSession, type AuthUser, createAuth } from "./auth";
import { createAuthMiddleware } from "./middleware/auth";
import { createRateLimiterMiddleware } from "./middleware/rate-limit";
import { createAdminRoutes } from "./routes/admin";
import { createCartRoutes } from "./routes/cart";
import { createCatalogRoutes } from "./routes/catalog";
import { createChatRoutes } from "./routes/chat";
import { createMediaRoutes } from "./routes/media";
import { createOrderRoutes } from "./routes/orders";
import { createPaymentRoutes } from "./routes/payments";
import { createPolicyRoutes } from "./routes/policies";
import type { ImageKitService } from "./services/imagekit";

export type AppEnv = {
  Variables: {
    requestId: string;
    tenantId: TenantId;
    user?: AuthUser | undefined;
    session?: AuthSession | undefined;
  };
};

export interface AppOptions {
  readonly database?: Database | undefined;
  readonly catalogRepo?: CatalogRepository | undefined;
  readonly cartRepo?: CartRepository | undefined;
  readonly orderRepo?: OrderRepository | undefined;
  readonly policyRepo?: PolicyRepository | undefined;
  readonly conversationRepo?: ConversationRepository | undefined;
  readonly paymentProvider?: PaymentProvider | undefined;
  readonly webhookSecret?: string | undefined;
  readonly chatModel?: ChatModel | undefined;
  readonly embeddingModel?: EmbeddingModel | undefined;
  readonly vectorStore?: VectorStore | undefined;
  readonly guardrail?: GuardrailEngine | undefined;
  readonly auth?: AuthInstance | undefined;
  readonly emailService?: EmailService | undefined;
  readonly enforceAdminAuth?: boolean | undefined;
  readonly chatRateLimiter?: RedisTokenBucket | undefined;
  readonly apiRateLimiter?: RedisTokenBucket | undefined;
  readonly imageKitService?: ImageKitService | undefined;
}

export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppEnv>();
  const db =
    options.database ??
    createDatabaseClient(
      process.env.DATABASE_URL ?? "postgres://avelor:avelor@localhost:5433/avelor_dev"
    );
  const catalogRepo = options.catalogRepo ?? new DrizzleCatalogRepository(db);
  const cartRepo = options.cartRepo ?? new InMemoryCartRepository();
  const orderRepo = options.orderRepo ?? new DrizzleOrderRepository(db);
  const policyRepo = options.policyRepo ?? new DrizzlePolicyRepository(db);
  const conversationRepo = options.conversationRepo ?? new DrizzleConversationRepository(db);
  const vectorStore = options.vectorStore ?? new PgVectorStore(db);
  const paymentProvider = options.paymentProvider ?? new MockPaymentProvider();
  const chatModel = options.chatModel ?? new MockChatModel();
  const guardrail = options.guardrail ?? new CompositeGuardrail();
  const emailService = options.emailService ?? new ResendEmailService();

  const auth = options.auth ?? createAuth({ database: db, emailService });
  const authMiddleware = createAuthMiddleware(auth);

  // CORS: only browser origins on the allowlist may call the API with credentials.
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    "*",
    cors({
      origin: (origin) => (origin && allowedOrigins.includes(origin) ? origin : undefined),
      allowHeaders: ["Content-Type", "Authorization", "x-tenant-id", "x-request-id"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      maxAge: 86400,
    })
  );

  // Request ID middleware
  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    await next();
  });

  // Better Auth handler for /api/auth and all sub-routes
  app.all("/api/auth", (c) => auth.handler(c.req.raw));
  app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
  app.all("/api/auth/**", (c) => auth.handler(c.req.raw));

  // Root endpoint: redirect browsers to storefront; provide JSON info to API clients
  app.get("/", (c) => {
    const accept = c.req.header("accept") ?? "";
    const storefrontUrl = allowedOrigins[0] ?? "http://localhost:3000";
    if (accept.includes("text/html")) {
      return c.redirect(storefrontUrl);
    }
    return c.json({
      name: "Avelor API",
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Apply Token Bucket rate limiting when configured
  if (options.apiRateLimiter) {
    app.use("/api/v1/*", createRateLimiterMiddleware(options.apiRateLimiter));
  }
  if (options.chatRateLimiter) {
    app.use("/api/v1/chat*", createRateLimiterMiddleware(options.chatRateLimiter, { cost: 1 }));
  }

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
      vectorStore,
    })
  );

  // Mount cart routes (supporting both plural and singular aliases)
  const cartRoutes = createCartRoutes(cartRepo, catalogRepo);
  app.route("/api/v1/carts", cartRoutes);
  app.route("/api/v1/cart", cartRoutes);

  // Mount public store policy routes
  app.route("/api/v1/policies", createPolicyRoutes(policyRepo));

  // Mount order & checkout routes
  app.route(
    "/api/v1/orders",
    createOrderRoutes(orderRepo, cartRepo, catalogRepo, paymentProvider, emailService)
  );

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
      vectorStore,
      policyRepo,
      guardrail,
      conversationRepo,
    })
  );

  // Mount media upload & ImageKit / Cloudflare CDN routes
  app.route(
    "/api/v1/media",
    createMediaRoutes({
      imageKitService: options.imageKitService,
      authMiddleware: options.enforceAdminAuth ? authMiddleware : undefined,
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
