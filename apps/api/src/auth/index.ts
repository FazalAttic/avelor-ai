import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { type EmailService, ResendEmailService } from "@avelor/core";
import * as schema from "@avelor/database";
import { createDatabaseClient, type Database, type Redis } from "@avelor/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, twoFactor } from "better-auth/plugins";

function ensureEnvLoaded(): void {
  const hasGoogle =
    (process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET) ||
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (hasGoogle) return;

  for (const envPath of [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env.local"),
    resolve(process.cwd(), "../../.env"),
    resolve(import.meta.dir, "../../../.env.local"),
    resolve(import.meta.dir, "../../../.env"),
  ]) {
    if (existsSync(envPath)) {
      try {
        process.loadEnvFile?.(envPath);
        break;
      } catch {
        // ignore
      }
    }
  }
}

export type UserRole = "admin" | "customer";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string | undefined;
  emailVerified: boolean;
  twoFactorEnabled?: boolean | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export interface CreateAuthOptions {
  database?: Database | undefined;
  redisClient?: Redis | undefined;
  secret?: string | undefined;
  baseURL?: string | undefined;
  googleClientId?: string | undefined;
  googleClientSecret?: string | undefined;
  emailService?: EmailService | undefined;
  requireEmailVerification?: boolean | undefined;
}

export interface AuthInstance {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (context: { headers: Headers }) => Promise<{
      user?: unknown;
      session?: unknown;
    } | null>;
    [key: string]: unknown;
  };
  options: {
    account?: {
      accountLinking?: {
        enabled?: boolean;
        trustedProviders?: string[];
        updateUserInfoOnLink?: boolean;
      };
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function createAuth(options: CreateAuthOptions = {}): AuthInstance {
  ensureEnvLoaded();

  const secret =
    options.secret ??
    process.env.AUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    "avelor_dev_secret_auth_32_chars_random_string_xyz";
  const baseURL =
    options.baseURL ??
    process.env.AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:5000";

  process.env.BETTER_AUTH_SECRET ??= secret;
  process.env.BETTER_AUTH_URL ??= baseURL;

  const googleClientId =
    options.googleClientId ?? process.env.AUTH_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret =
    options.googleClientSecret ??
    process.env.AUTH_GOOGLE_CLIENT_SECRET ??
    process.env.GOOGLE_CLIENT_SECRET;
  const hasGoogle = Boolean(googleClientId && googleClientSecret);

  const database =
    options.database ??
    createDatabaseClient(
      process.env.DATABASE_URL ?? "postgres://avelor:avelor@localhost:5433/avelor_dev"
    );

  const dbConfig = drizzleAdapter(database, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactors,
    },
  });

  // Better Auth rejects cookie-authenticated POSTs from origins not on this list (CSRF guard).
  // Reuse the CORS allowlist so the storefront origin is trusted in one place.
  const trustedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const emailService = options.emailService ?? new ResendEmailService();
  const requireEmailVerification =
    options.requireEmailVerification ?? process.env.REQUIRE_EMAIL_VERIFICATION === "true";

  const redis = options.redisClient;
  const secondaryStorage = redis
    ? {
        get: async (key: string) => {
          return await redis.get(`auth:${key}`);
        },
        set: async (key: string, value: string, ttl?: number) => {
          if (ttl && ttl > 0) {
            await redis.set(`auth:${key}`, value, "EX", Math.floor(ttl));
          } else {
            await redis.set(`auth:${key}`, value);
          }
        },
        delete: async (key: string) => {
          await redis.del(`auth:${key}`);
        },
      }
    : undefined;

  return betterAuth({
    secret,
    baseURL,
    trustedOrigins,
    database: dbConfig as never,
    secondaryStorage: secondaryStorage as never,
    session: {
      storeSessionInDatabase: true,
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification,
      sendResetPassword: async ({ user, url }) => {
        await emailService.sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl: url,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await emailService.sendVerificationEmail({
          to: user.email,
          name: user.name,
          verifyUrl: url,
        });
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
        requireLocalEmailVerified: false,
        updateUserInfoOnLink: true,
      },
    },
    socialProviders: hasGoogle
      ? {
          google: {
            clientId: googleClientId as string,
            clientSecret: googleClientSecret as string,
          },
        }
      : undefined,
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "customer",
        },
        tenantId: {
          type: "string",
          required: false,
        },
        twoFactorEnabled: {
          type: "boolean",
          required: false,
          defaultValue: false,
        },
      },
    },
    plugins: [
      bearer(),
      twoFactor({
        issuer: "Avelor Admin",
      }),
    ],
  }) as unknown as AuthInstance;
}
