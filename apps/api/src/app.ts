import { type CatalogRepository, InMemoryCatalogRepository, type TenantId } from "@avelor/core";
import { Hono } from "hono";
import { createCatalogRoutes } from "./routes/catalog";

export type AppEnv = {
  Variables: {
    requestId: string;
    tenantId: TenantId;
  };
};

export interface AppOptions {
  readonly catalogRepo?: CatalogRepository | undefined;
}

export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppEnv>();
  const catalogRepo = options.catalogRepo ?? new InMemoryCatalogRepository();

  // Request ID middleware
  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    await next();
  });

  // Health check endpoint
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount catalog routes
  app.route("/api/v1/products", createCatalogRoutes(catalogRepo));

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
