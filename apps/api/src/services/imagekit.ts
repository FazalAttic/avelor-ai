import crypto from "node:crypto";

export interface ImageKitUploadResult {
  readonly url: string;
  readonly rawUrl: string;
  readonly fileId: string;
  readonly filePath: string;
  readonly name: string;
  readonly size: number;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly isMock?: boolean | undefined;
}

export interface ImageKitAuthParams {
  readonly token: string;
  readonly expire: number;
  readonly signature: string;
  readonly publicKey: string;
}

export interface ImageKitOptions {
  readonly publicKey?: string | undefined;
  readonly privateKey?: string | undefined;
  readonly urlEndpoint?: string | undefined;
  readonly cdnUrl?: string | undefined;
}

export class ImageKitService {
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly urlEndpoint: string;
  private readonly cdnUrl: string;

  constructor(options: ImageKitOptions = {}) {
    this.publicKey = options.publicKey ?? process.env.IMAGEKIT_PUBLIC_KEY ?? "";
    this.privateKey = options.privateKey ?? process.env.IMAGEKIT_PRIVATE_KEY ?? "";
    this.urlEndpoint = (
      options.urlEndpoint ??
      process.env.IMAGEKIT_URL_ENDPOINT ??
      "https://ik.imagekit.io/mqz7lr6zf"
    ).replace(/\/+$/, "");
    this.cdnUrl = (options.cdnUrl ?? process.env.IMAGEKIT_CDN_URL ?? "").replace(/\/+$/, "");
  }

  /**
   * Upload an image to ImageKit. If IMAGEKIT_CDN_URL (Cloudflare Worker) is configured,
   * the public URL points to the Cloudflare Edge CDN proxy for permanent edge caching
   * and brand title-bar previews, protecting ImageKit origin bandwidth.
   */
  async uploadImage(
    fileBuffer: Buffer | Uint8Array,
    fileName: string,
    folder = "/avelor/products",
    tags: string[] = ["avelor"]
  ): Promise<ImageKitUploadResult> {
    // Local dev / test fallback when ImageKit credentials are not set
    if (!this.privateKey) {
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const mockFilePath = `${folder}/${sanitizedName}`;
      const mockUrl = this.cdnUrl
        ? `${this.cdnUrl}${mockFilePath}`
        : `${this.urlEndpoint}${mockFilePath}`;

      return {
        url: mockUrl,
        rawUrl: `${this.urlEndpoint}${mockFilePath}`,
        fileId: `mock_file_${crypto.randomUUID().slice(0, 12)}`,
        filePath: mockFilePath,
        name: fileName,
        size: fileBuffer.byteLength,
        width: 1200,
        height: 1200,
        isMock: true,
      };
    }

    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append("file", blob, fileName);
    formData.append("fileName", fileName);
    formData.append("folder", folder);
    formData.append("useUniqueFileName", "true");
    if (tags.length > 0) {
      formData.append("tags", tags.join(","));
    }

    const authHeader = `Basic ${Buffer.from(`${this.privateKey}:`).toString("base64")}`;

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    if (!response.ok) {
      let detail = `ImageKit upload failed (${response.status})`;
      try {
        const errorJson = (await response.json()) as { message?: string; help?: string };
        if (errorJson.message) {
          detail = errorJson.message;
        }
      } catch {
        // Fallback to text status
      }
      throw new Error(detail);
    }

    const data = (await response.json()) as {
      fileId: string;
      name: string;
      filePath: string;
      url: string;
      size: number;
      width?: number;
      height?: number;
    };

    // If Cloudflare CDN URL is configured, transform the origin URL to route through Cloudflare
    const publicUrl = this.cdnUrl ? `${this.cdnUrl}${data.filePath}` : data.url;

    return {
      url: publicUrl,
      rawUrl: data.url,
      fileId: data.fileId,
      filePath: data.filePath,
      name: data.name,
      size: data.size,
      width: data.width,
      height: data.height,
      isMock: false,
    };
  }

  /**
   * Generates secure client-side upload parameters for the ImageKit frontend SDK if needed.
   */
  getAuthParameters(): ImageKitAuthParams {
    if (!this.privateKey) {
      return {
        token: "mock-token",
        expire: Math.floor(Date.now() / 1000) + 1800,
        signature: "mock-signature",
        publicKey: this.publicKey || "mock-public-key",
      };
    }

    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 1800; // 30 minutes validity
    const signature = crypto
      .createHmac("sha1", this.privateKey)
      .update(token + expire)
      .digest("hex");

    return {
      token,
      expire,
      signature,
      publicKey: this.publicKey,
    };
  }
}

export const defaultImageKitService = new ImageKitService();
