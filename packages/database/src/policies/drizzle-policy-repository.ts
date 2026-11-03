import {
  type PolicyRepository,
  type PolicyTopic,
  parseTenantId,
  type StorePolicy,
  type TenantId,
  type UpsertPolicyInput,
} from "@avelor/core";
import { and, eq } from "drizzle-orm";
import type { Database } from "../index";
import { storePolicies } from "../schema/policies";

function mapPolicyRow(row: typeof storePolicies.$inferSelect): StorePolicy {
  return {
    id: row.id,
    tenantId: parseTenantId(row.tenantId),
    topic: row.topic as PolicyTopic,
    title: row.title,
    content: row.content,
    updatedAt: row.updatedAt,
  };
}

/**
 * PostgreSQL Policy Repository implemented with Drizzle ORM.
 * Stores store policies (returns, shipping, privacy, etc.) queried by the AI assistant.
 */
export class DrizzlePolicyRepository implements PolicyRepository {
  constructor(private readonly db: Database) {}

  async getPolicy(tenantId: TenantId, topic: PolicyTopic): Promise<StorePolicy | null> {
    const [row] = await this.db
      .select()
      .from(storePolicies)
      .where(and(eq(storePolicies.tenantId, tenantId), eq(storePolicies.topic, topic)))
      .limit(1);

    if (!row) {
      return null;
    }

    return mapPolicyRow(row);
  }

  async listPolicies(tenantId: TenantId): Promise<readonly StorePolicy[]> {
    const rows = await this.db
      .select()
      .from(storePolicies)
      .where(eq(storePolicies.tenantId, tenantId));

    return Object.freeze(rows.map(mapPolicyRow));
  }

  async upsertPolicy(tenantId: TenantId, input: UpsertPolicyInput): Promise<StorePolicy> {
    const now = new Date();
    const existing = await this.getPolicy(tenantId, input.topic);

    if (existing) {
      const [updated] = await this.db
        .update(storePolicies)
        .set({
          title: input.title.trim(),
          content: input.content.trim(),
          updatedAt: now,
        })
        .where(and(eq(storePolicies.tenantId, tenantId), eq(storePolicies.topic, input.topic)))
        .returning();

      if (!updated) {
        throw new Error(`Failed to update policy: ${input.topic}`);
      }

      return mapPolicyRow(updated);
    }

    const id = `pol_${crypto.randomUUID()}`;
    const [inserted] = await this.db
      .insert(storePolicies)
      .values({
        id,
        tenantId,
        topic: input.topic,
        title: input.title.trim(),
        content: input.content.trim(),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inserted) {
      throw new Error(`Failed to insert policy: ${input.topic}`);
    }

    return mapPolicyRow(inserted);
  }
}
