import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";
import { ImageKitService } from "../src/services/imagekit";

describe("Media & ImageKit / Cloudflare CDN Endpoints", () => {
  const tenantId = "store_alpha";

  it("rejects upload requests without x-tenant-id header", async () => {
    const app = createApp();
    const formData = new FormData();
    formData.append("file", new Blob(["fake-image-bytes"], { type: "image/png" }), "shoe.png");

    const res = await app.request("/api/v1/media/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TENANT_ID");
  });

  it("rejects upload requests with missing file field", async () => {
    const app = createApp();
    const formData = new FormData();
    formData.append("wrong_field", "value");

    const res = await app.request("/api/v1/media/upload", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantId,
      },
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_FILE");
  });

  it("rejects non-image MIME types with 415 Unsupported Media Type", async () => {
    const app = createApp();
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["malicious script or text"], { type: "text/plain" }),
      "notes.txt"
    );

    const res = await app.request("/api/v1/media/upload", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantId,
      },
      body: formData,
    });

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("uploads image successfully and returns asset details with mock in dev mode", async () => {
    const app = createApp();
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }),
      "sneaker-hero.png"
    );

    const res = await app.request("/api/v1/media/upload", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantId,
      },
      body: formData,
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.name).toBe("sneaker-hero.png");
    expect(body.url).toContain("sneaker-hero.png");
    expect(body.fileId).toBeDefined();
  });

  it("transforms public image URL to Cloudflare Edge CDN when IMAGEKIT_CDN_URL is configured", async () => {
    const cdnUrl = "https://cdn.avelor.store";
    const customService = new ImageKitService({
      cdnUrl,
      urlEndpoint: "https://ik.imagekit.io/mqz7lr6zf",
    });

    const app = createApp({
      imageKitService: customService,
    });

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }),
      "jacket-cover.jpg"
    );

    const res = await app.request("/api/v1/media/upload", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantId,
      },
      body: formData,
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.url).toMatch(
      /^https:\/\/cdn\.avelor\.store\/avelor\/store_alpha\/products\/jacket-cover.*\.jpg/
    );
    expect(body.rawUrl).toMatch(/^https:\/\/ik\.imagekit\.io\/mqz7lr6zf/);
  });

  it("serves ImageKit client authentication parameters for direct uploads", async () => {
    const app = createApp();
    const res = await app.request("/api/v1/media/auth", {
      headers: {
        "x-tenant-id": tenantId,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.expire).toBeDefined();
    expect(body.signature).toBeDefined();
  });
});
