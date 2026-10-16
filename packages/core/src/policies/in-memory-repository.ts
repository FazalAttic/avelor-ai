import type { TenantId } from "../tenant";
import type { PolicyRepository, PolicyTopic, StorePolicy, UpsertPolicyInput } from "./types";

/**
 * In-memory implementation of PolicyRepository for testing, local development, and CI.
 */
export class InMemoryPolicyRepository implements PolicyRepository {
  private readonly policies = new Map<string, StorePolicy>();

  private makeKey(tenantId: TenantId, topic: PolicyTopic): string {
    return `${tenantId}:${topic}`;
  }

  async getPolicy(tenantId: TenantId, topic: PolicyTopic): Promise<StorePolicy | null> {
    const policy = this.policies.get(this.makeKey(tenantId, topic));
    return policy ? { ...policy } : null;
  }

  async listPolicies(tenantId: TenantId): Promise<readonly StorePolicy[]> {
    const results: StorePolicy[] = [];
    for (const p of this.policies.values()) {
      if (p.tenantId === tenantId) {
        results.push({ ...p });
      }
    }
    return results;
  }

  async upsertPolicy(tenantId: TenantId, input: UpsertPolicyInput): Promise<StorePolicy> {
    const key = this.makeKey(tenantId, input.topic);
    const existing = this.policies.get(key);

    const record: StorePolicy = {
      id: existing?.id ?? `pol_${crypto.randomUUID().slice(0, 12)}`,
      tenantId,
      topic: input.topic,
      title: input.title.trim(),
      content: input.content.trim(),
      updatedAt: new Date(),
    };

    this.policies.set(key, record);
    return { ...record };
  }
}
