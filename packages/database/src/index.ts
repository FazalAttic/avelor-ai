import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as ordersSchema from "./schema/orders";
import * as productsSchema from "./schema/products";

export * from "./schema/auth";
export * from "./schema/orders";
export * from "./schema/products";

export const schema = {
  ...productsSchema,
  ...ordersSchema,
  ...authSchema,
};

export function createDatabaseClient(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabaseClient>;
