import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";

describe("API Health and Core Middleware", () => {
  const app = createApp();

  it("returns 200 and healthy status on GET /health", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(typeof data.timestamp).toBe("string");
    expect(typeof data.uptime).toBe("number");
  });

  it("attaches and echoes x-request-id", async () => {
    // When provided
    const res1 = await app.request("/health", {
      headers: { "x-request-id": "custom-req-id-123" },
    });
    expect(res1.headers.get("x-request-id")).toBe("custom-req-id-123");

    // When not provided, generates one
    const res2 = await app.request("/health");
    const generatedId = res2.headers.get("x-request-id");
    expect(typeof generatedId).toBe("string");
    expect(generatedId?.length).toBeGreaterThan(10);
  });

  it("returns structured 404 for unknown routes", async () => {
    const res = await app.request("/non-existent-endpoint");
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });
});
