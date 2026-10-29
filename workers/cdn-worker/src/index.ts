export interface Env {
  IMAGEKIT_ENDPOINT?: string;
  BRAND_NAME?: string;
  ICON_URL?: string;
}

// Built-in SVG logo for Avelor / CDN
const DEFAULT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="28" fill="#0e0e11"/>
  <rect x="1.5" y="1.5" width="97" height="97" rx="26.5" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>
  <path d="M50 22L76 72H62L50 48L38 72H24L50 22Z" fill="url(#g)"/>
  <circle cx="50" cy="62" r="5" fill="#ffffff"/>
</svg>`;

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const imageKitEndpoint = (env.IMAGEKIT_ENDPOINT ?? "https://ik.imagekit.io/mqz7lr6zf").replace(
      /\/+$/,
      ""
    );
    const brandName = env.BRAND_NAME ?? "avelor-ai.cyou";
    const iconUrl = env.ICON_URL ?? `${url.origin}/icon.svg`;

    // Serve custom brand SVG icon
    if (url.pathname === "/icon.svg" || url.pathname === "/favicon.ico") {
      return new Response(DEFAULT_ICON_SVG, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=315360000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Root domain status page with brand favicon
    if (url.pathname === "/" || url.pathname === "") {
      const rootHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CDN Service Active — ${brandName}</title>
  <link rel="icon" href="${iconUrl}" type="image/svg+xml">
  <link rel="shortcut icon" href="${iconUrl}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background-color: #0e0e11;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
    }
    .badge {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 28px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      backdrop-filter: blur(16px);
      font-size: 16px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="badge">
    <img src="${iconUrl}" width="28" height="28" alt="Icon" />
    <span>✨ CDN Service Active — ${brandName}</span>
  </div>
</body>
</html>`;

      return new Response(rootHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const targetUrl = imageKitEndpoint + url.pathname + url.search;

    const accept = request.headers.get("Accept") || "";
    const isDirectBrowserView =
      accept.includes("text/html") &&
      !url.searchParams.has("raw") &&
      !url.pathname.endsWith(".svg") &&
      !url.pathname.endsWith(".json");

    // If opened directly in a browser tab, render minimal image container with brand favicon & title in the tab
    if (isDirectBrowserView) {
      const rawUrl = `${url.pathname}?raw=1`;
      const rawFileName = url.pathname.split("/").pop() || "Asset";
      const fileName = decodeURIComponent(rawFileName);

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${fileName} — ${brandName}</title>
  <link rel="icon" href="${iconUrl}" type="image/svg+xml">
  <link rel="shortcut icon" href="${iconUrl}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0e0e11;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      overflow: hidden;
    }
    .container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 92vw;
      max-height: 88vh;
      border-radius: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 30px 60px rgba(0,0,0,0.8);
      backdrop-filter: blur(20px);
    }
    img {
      max-width: 100%;
      max-height: 82vh;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${rawUrl}" alt="${fileName}" />
  </div>
</body>
</html>`;

      return new Response(htmlContent, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Fetch raw image file from ImageKit with Cloudflare edge caching
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      cf: {
        cacheEverything: true,
        cacheTtl: 315360000, // Permanent 10 years Cloudflare Edge Cache
      },
    });

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
    newHeaders.set("Cache-Control", "public, max-age=315360000, immutable");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
