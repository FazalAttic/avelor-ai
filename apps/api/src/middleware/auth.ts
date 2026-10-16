import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../app";
import type { AuthInstance, AuthSession, AuthUser, UserRole } from "../auth";

export function createAuthMiddleware(auth: AuthInstance) {
  const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
    try {
      const sessionData = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!sessionData || !sessionData.user) {
        return c.json(
          {
            error: {
              code: "UNAUTHORIZED",
              message: "Authentication required to access this resource",
            },
          },
          401
        );
      }

      c.set("user", sessionData.user as unknown as AuthUser);
      c.set("session", sessionData.session as unknown as AuthSession);
      await next();
    } catch {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired authentication session",
          },
        },
        401
      );
    }
  };

  const requireRole = (allowedRole: UserRole): MiddlewareHandler<AppEnv> => {
    return async (c, next) => {
      const user = c.get("user");
      if (!user) {
        return c.json(
          {
            error: {
              code: "UNAUTHORIZED",
              message: "Authentication required",
            },
          },
          401
        );
      }

      if (user.role !== allowedRole) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN",
              message: `Access forbidden: requires '${allowedRole}' role`,
            },
          },
          403
        );
      }

      // Enforce merchant tenant boundary
      if (allowedRole === "merchant" && user.tenantId) {
        const tenantId = c.get("tenantId");
        if (tenantId && user.tenantId !== tenantId) {
          return c.json(
            {
              error: {
                code: "TENANT_MISMATCH",
                message: "Merchant account does not have access to this store tenant",
              },
            },
            403
          );
        }
      }

      await next();
    };
  };

  const optionalAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
    try {
      const sessionData = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (sessionData?.user) {
        c.set("user", sessionData.user as unknown as AuthUser);
        c.set("session", sessionData.session as unknown as AuthSession);
      }
    } catch {
      // Ignore errors for optional auth
    }
    await next();
  };

  return {
    requireAuth,
    requireRole,
    optionalAuth,
  };
}
