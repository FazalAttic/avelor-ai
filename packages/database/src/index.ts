import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as ordersSchema from "./schema/orders";
import * as productsSchema from "./schema/products";

export * from "./schema/orders";
export * from "./schema/products";

export const schema = {
  ...productsSchema,
  ...ordersSchema,
};

export function createDatabaseClient(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabaseClient>;
