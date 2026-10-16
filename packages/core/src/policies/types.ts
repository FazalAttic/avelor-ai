import type { TenantId } from "../tenant";

export type PolicyTopic = "returns" | "shipping" | "privacy" | "terms" | "faq" | "general";

export interface StorePolicy {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly topic: PolicyTopic;
  readonly title: string;
  readonly content: string;
  readonly updatedAt: Date;
}

export interface UpsertPolicyInput {
  readonly topic: PolicyTopic;
  readonly title: string;
  readonly content: string;
}

export interface PolicyRepository {
  getPolicy(tenantId: TenantId, topic: PolicyTopic): Promise<StorePolicy | null>;
  listPolicies(tenantId: TenantId): Promise<readonly StorePolicy[]>;
  upsertPolicy(tenantId: TenantId, input: UpsertPolicyInput): Promise<StorePolicy>;
}
