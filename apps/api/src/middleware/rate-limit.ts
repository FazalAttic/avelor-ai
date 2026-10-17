import type { RedisTokenBucket } from "@avelor/database";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../app";

export interface RateLimiterMiddlewareOptions {
  /** Cost in tokens for this route (defaults to 1; e.g. 3 for LLM chat) */
  readonly cost?: number;
  /** Function to extract the client identifier (defaults to IP address or x-forwarded-for) */
  readonly keyGenerator?: (c: Parameters<MiddlewareHandler<AppEnv>>[0]) => string;
}

/**
 * High-performance Token Bucket rate limiting middleware.
 * Attaches X-RateLimit headers and returns HTTP 429 when bucket capacity is exhausted.
 */
export function createRateLimiterMiddleware(
  bucket: RedisTokenBucket,
  options: RateLimiterMiddlewareOptions = {}
): MiddlewareHandler<AppEnv> {
  const cost = options.cost ?? 1;

  return async (c, next) => {
    const identifier =
      options.keyGenerator?.(c) ??
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      "127.0.0.1";

    const result = await bucket.consume(identifier, cost);

    c.header("X-RateLimit-Limit", result.capacity.toString());
    c.header("X-RateLimit-Remaining", result.remaining.toString());

    if (!result.allowed) {
      c.header("Retry-After", result.retryAfterSeconds.toString());
      return c.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many requests. Please wait ${result.retryAfterSeconds} seconds before retrying.`,
            retryAfter: result.retryAfterSeconds,
          },
        },
        429
      );
    }

    await next();
  };
}
