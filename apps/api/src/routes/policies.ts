import type { PolicyRepository, PolicyTopic } from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { requireTenant } from "../middleware/tenant";

const VALID_TOPICS: PolicyTopic[] = ["returns", "shipping", "privacy", "terms", "faq", "general"];

export function createPolicyRoutes(repo: PolicyRepository) {
  const router = new Hono<AppEnv>();

  router.use("*", requireTenant);

  // List published store policies for the active tenant
  router.get("/", async (c) => {
    const tenantId = c.get("tenantId");
    const policies = await repo.listPolicies(tenantId);
    return c.json(policies);
  });

  // Retrieve a single policy by topic
  router.get("/:topic", async (c) => {
    const tenantId = c.get("tenantId");
    const rawTopic = c.req.param("topic");
    const topic = rawTopic?.toLowerCase() as PolicyTopic;

    if (!VALID_TOPICS.includes(topic)) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid policy topic '${rawTopic}'. Allowed: ${VALID_TOPICS.join(", ")}`,
          },
        },
        400
      );
    }

    const policy = await repo.getPolicy(tenantId, topic);
    if (!policy) {
      return c.json(
        {
          error: {
            code: "POLICY_NOT_FOUND",
            message: `No policy published for topic '${topic}'`,
          },
        },
        404
      );
    }

    return c.json(policy);
  });

  return router;
}
