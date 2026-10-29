import { Hono } from "hono";
import type { AppEnv } from "../app";
import type { createAuthMiddleware } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { defaultImageKitService, type ImageKitService } from "../services/imagekit";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

export interface MediaRoutesOptions {
  imageKitService?: ImageKitService | undefined;
  authMiddleware?: ReturnType<typeof createAuthMiddleware> | undefined;
}

export function createMediaRoutes(options: MediaRoutesOptions = {}) {
  const router = new Hono<AppEnv>();
  const imageKit = options.imageKitService ?? defaultImageKitService;

  router.use("*", requireTenant);

  // If admin auth middleware is supplied, require admin role for uploading media
  if (options.authMiddleware) {
    router.use("/upload", options.authMiddleware.requireAuth);
    router.use("/upload", options.authMiddleware.requireRole("admin"));
  }

  // Upload image to ImageKit (routes through Cloudflare Edge CDN if configured)
  router.post("/upload", async (c) => {
    const tenantId = c.get("tenantId");

    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch {
      return c.json(
        { error: { code: "INVALID_FORM_DATA", message: "Expected multipart/form-data payload" } },
        400
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string" || !(file instanceof File)) {
      return c.json(
        { error: { code: "MISSING_FILE", message: "A valid 'file' form field is required" } },
        400
      );
    }

    // Validate size limit
    if (file.size > MAX_IMAGE_BYTES) {
      return c.json(
        {
          error: {
            code: "FILE_TOO_LARGE",
            message: `File exceeds maximum allowed size of ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
          },
        },
        400
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return c.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: `Unsupported file type '${file.type}'. Allowed: JPEG, PNG, WebP, GIF, SVG, AVIF`,
          },
        },
        415
      );
    }

    const customFolder = formData.get("folder");
    const folder =
      typeof customFolder === "string" && customFolder.trim()
        ? customFolder.trim()
        : `/avelor/${tenantId}/products`;

    const customFileName = formData.get("fileName");
    const fileName =
      typeof customFileName === "string" && customFileName.trim()
        ? customFileName.trim()
        : file.name || `image_${Date.now()}`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await imageKit.uploadImage(buffer, fileName, folder, [
        tenantId,
        "avelor-products",
      ]);

      return c.json(
        {
          success: true,
          url: result.url,
          rawUrl: result.rawUrl,
          fileId: result.fileId,
          filePath: result.filePath,
          name: result.name,
          size: result.size,
          width: result.width,
          height: result.height,
          isMock: result.isMock ?? false,
        },
        201
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image upload failed";
      return c.json({ error: { code: "UPLOAD_FAILED", message } }, 502);
    }
  });

  // Client-side authentication parameters for direct ImageKit SDK uploads
  router.get("/auth", (c) => {
    const authParams = imageKit.getAuthParameters();
    return c.json(authParams);
  });

  return router;
}
