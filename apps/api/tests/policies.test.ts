import { beforeEach, describe, expect, it } from "bun:test";
import { InMemoryPolicyRepository } from "@avelor/core";
import { createApp } from "../src/app";

describe("Public Store Policy HTTP API Endpoints", () => {
  let app: ReturnType<typeof createApp>;
  let policyRepo: InMemoryPolicyRepository;

  const tenantA = "store_alpha";
  const tenantB = "store_beta";

  beforeEach(async () => {
    policyRepo = new InMemoryPolicyRepository();
    app = createApp({ policyRepo });

    await policyRepo.upsertPolicy(tenantA, {
      topic: "returns",
      title: "30-Day Hassle-Free Returns",
      content: "Items in original condition may be returned within 30 days of delivery.",
    });
  });

  it("rejects requests without x-tenant-id", async () => {
    const res = await app.request("/api/v1/policies");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TENANT_ID");
  });

  it("lists policies for the active tenant", async () => {
    const res = await app.request("/api/v1/policies", {
      headers: { "x-tenant-id": tenantA },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(1);
    expect(body[0].topic).toBe("returns");
    expect(body[0].title).toBe("30-Day Hassle-Free Returns");
  });

  it("enforces tenant isolation", async () => {
    const res = await app.request("/api/v1/policies", {
      headers: { "x-tenant-id": tenantB },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(0);
  });

  it("retrieves a single policy by topic", async () => {
    const res = await app.request("/api/v1/policies/returns", {
      headers: { "x-tenant-id": tenantA },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.topic).toBe("returns");
    expect(body.content).toContain("30 days");
  });

  it("returns 404 for a topic with no published policy", async () => {
    const res = await app.request("/api/v1/policies/shipping", {
      headers: { "x-tenant-id": tenantA },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("POLICY_NOT_FOUND");
  });

  it("rejects invalid policy topics", async () => {
    const res = await app.request("/api/v1/policies/nonsense", {
      headers: { "x-tenant-id": tenantA },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
