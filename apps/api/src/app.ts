import { Hono } from "hono";

export type AppEnv = {
  Variables: {
    requestId: string;
  };
};

export function createApp() {
  const app = new Hono<AppEnv>();

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
    // Redact internal error traces from production responses
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
