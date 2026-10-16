import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as embeddingsSchema from "./schema/embeddings";
import * as ordersSchema from "./schema/orders";
import * as policiesSchema from "./schema/policies";
import * as productsSchema from "./schema/products";

export * from "./schema/auth";
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
};

export function createDatabaseClient(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabaseClient>;
