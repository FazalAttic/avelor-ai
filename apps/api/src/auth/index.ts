import { Database as SqliteDatabase } from "bun:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { type EmailService, ResendEmailService } from "@avelor/core";
import type { Database } from "@avelor/database";
import * as schema from "@avelor/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, twoFactor } from "better-auth/plugins";

function ensureEnvLoaded(): void {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) return;

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

function initializeInMemorySqlite(): SqliteDatabase {
  const db = new SqliteDatabase(":memory:");
  db.run(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      emailVerified BOOLEAN NOT NULL DEFAULT 0,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      tenantId TEXT,
      twoFactorEnabled BOOLEAN NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expiresAt DATETIME NOT NULL,
      token TEXT NOT NULL UNIQUE,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      userId TEXT NOT NULL REFERENCES user(id)
    );
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      userId TEXT NOT NULL REFERENCES user(id),
      accessToken TEXT,
      refreshToken TEXT,
      idToken TEXT,
      accessTokenExpiresAt DATETIME,
      refreshTokenExpiresAt DATETIME,
      scope TEXT,
      password TEXT,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME,
      updatedAt DATETIME
    );
    CREATE TABLE IF NOT EXISTS twoFactor (
      id TEXT PRIMARY KEY,
      secret TEXT NOT NULL,
      backupCodes TEXT NOT NULL,
      userId TEXT NOT NULL REFERENCES user(id),
      verified BOOLEAN NOT NULL DEFAULT 1,
      failedVerificationCount INTEGER NOT NULL DEFAULT 0,
      lockedUntil DATETIME
    );
  `);
  return db;
}

export function createAuth(options: CreateAuthOptions = {}): AuthInstance {
  ensureEnvLoaded();

  const secret =
    options.secret ??
    process.env.BETTER_AUTH_SECRET ??
    "avelor_dev_secret_auth_32_chars_random_string_xyz";
  const baseURL = options.baseURL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000";

  const googleClientId = options.googleClientId ?? process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = options.googleClientSecret ?? process.env.GOOGLE_CLIENT_SECRET;
  const hasGoogle = Boolean(googleClientId && googleClientSecret);

  let dbConfig: unknown;
  if (options.database) {
    dbConfig = drizzleAdapter(options.database, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        twoFactor: schema.twoFactors,
      },
    });
  } else {
    // In-memory fallback for offline development & tests
    dbConfig = initializeInMemorySqlite();
  }

  // Better Auth rejects cookie-authenticated POSTs from origins not on this list (CSRF guard).
  // Reuse the CORS allowlist so the storefront origin is trusted in one place.
  const trustedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const emailService = options.emailService ?? new ResendEmailService();
  const requireEmailVerification =
    options.requireEmailVerification ?? process.env.REQUIRE_EMAIL_VERIFICATION === "true";

  return betterAuth({
    secret,
    baseURL,
    trustedOrigins,
    database: dbConfig as never,
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
