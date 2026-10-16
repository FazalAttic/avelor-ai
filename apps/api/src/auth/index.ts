import { Database as SqliteDatabase } from "bun:sqlite";
import type { Database } from "@avelor/database";
import * as schema from "@avelor/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

export type UserRole = "admin" | "customer";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string | undefined;
  emailVerified: boolean;
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
  `);
  return db;
}

export function createAuth(options: CreateAuthOptions = {}) {
  const secret =
    options.secret ??
    process.env.BETTER_AUTH_SECRET ??
    "avelor_dev_secret_auth_32_chars_random_string_xyz";
  const baseURL = options.baseURL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  let dbConfig: unknown;
  if (options.database) {
    dbConfig = drizzleAdapter(options.database, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    });
  } else {
    // In-memory fallback for offline development & tests
    dbConfig = initializeInMemorySqlite();
  }

  return betterAuth({
    secret,
    baseURL,
    database: dbConfig as never,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
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
      },
    },
    plugins: [bearer()],
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
