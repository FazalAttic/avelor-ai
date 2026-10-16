import { describe, expect, it } from "bun:test";
import { InMemoryCatalogRepository, InMemoryPolicyRepository, parseTenantId } from "@avelor/core";
import { DiscoveryAgent } from "../src/agent/discovery-agent";
import { MockChatModel } from "../src/models/mock-model";
import { executeToolCall } from "../src/tools/catalog-tools";

describe("Store Policy & Knowledge RAG", () => {
  const tenantA = parseTenantId("store_alpha");
  const tenantB = parseTenantId("store_beta");

  it("retrieves configured store policy via executeToolCall", async () => {
    const catalogRepo = new InMemoryCatalogRepository();
    const policyRepo = new InMemoryPolicyRepository();

    await policyRepo.upsertPolicy(tenantA, {
      topic: "returns",
      title: "Hassle-Free 60-Day Returns",
      content:
        "Return any unworn apparel or unopened merchandise within 60 days for a 100% refund.",
    });

    const raw = await executeToolCall(
      "get_store_policy",
      { topic: "returns" },
      { tenantId: tenantA, catalogRepo, policyRepo }
    );

    const result = JSON.parse(raw);
    expect(result.status).toBe("success");
    expect(result.topic).toBe("returns");
    expect(result.title).toBe("Hassle-Free 60-Day Returns");
    expect(result.content).toContain("within 60 days");
  });

  it("enforces tenant boundary isolation on store policies", async () => {
    const catalogRepo = new InMemoryCatalogRepository();
    const policyRepo = new InMemoryPolicyRepository();

    // Store A has 60-day returns
    await policyRepo.upsertPolicy(tenantA, {
      topic: "returns",
      title: "Store A 60-Day Policy",
      content: "60 days returns for Store A only.",
    });

    // Store B has not set a policy
    const rawB = await executeToolCall(
      "get_store_policy",
      { topic: "returns" },
      { tenantId: tenantB, catalogRepo, policyRepo }
    );

    const resultB = JSON.parse(rawB);
    // Must return default fallback for Store B, NOT Store A's policy
    expect(resultB.status).toBe("default");
    expect(resultB.message).toContain("30 days");
    expect(resultB.title).toBeUndefined();
  });

  it("answers shopper questions grounded in official store policies via DiscoveryAgent", async () => {
    const catalogRepo = new InMemoryCatalogRepository();
    const policyRepo = new InMemoryPolicyRepository();
    const model = new MockChatModel();

    await policyRepo.upsertPolicy(tenantA, {
      topic: "returns",
      title: "Store Alpha Extended Return Guarantee",
      content: "All orders come with our 45-day satisfaction guarantee.",
    });

    const agent = new DiscoveryAgent(model, catalogRepo, tenantA, { policyRepo });

    const response = await agent.chat("What is your refund and return policy?");

    expect(response.reply).toContain("returns policy");
    expect(response.reply).toContain("45-day satisfaction guarantee");
    expect(response.toolCallsExecuted.length).toBe(1);
    expect(response.toolCallsExecuted[0]?.name).toBe("get_store_policy");
  });
});
