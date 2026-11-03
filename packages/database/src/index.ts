import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as conversationsSchema from "./schema/conversations";
import * as embeddingsSchema from "./schema/embeddings";
import * as ordersSchema from "./schema/orders";
import * as policiesSchema from "./schema/policies";
import * as productsSchema from "./schema/products";

export * from "./catalog/drizzle-catalog-repository";
export * from "./conversations/drizzle-conversation-repository";
export * from "./orders/drizzle-order-repository";
export * from "./policies/drizzle-policy-repository";
export * from "./redis/cache";
export * from "./redis/cart-repository";
export * from "./redis/client";
export * from "./redis/token-bucket";
export * from "./schema/auth";
export * from "./schema/conversations";
export * from "./schema/embeddings";
export * from "./schema/orders";
export * from "./schema/policies";
export * from "./schema/products";
export * from "./vector/pgvector-store";

export const schema = {
  ...productsSchema,
  ...ordersSchema,
  ...authSchema,
  ...embeddingsSchema,
  ...policiesSchema,
  ...conversationsSchema,
};

export function createDatabaseClient(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabaseClient>;
