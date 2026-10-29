# Avelor AI — Cloudflare Edge CDN & ImageKit Proxy

This Cloudflare Worker sits in front of **ImageKit** to provide:
1. **Permanent 10-Year Edge Caching (`cacheEverything: true`, `cacheTtl: 315360000`)**: Cloudflare caches every image on its global edge. ImageKit is requested only once per asset, completely bypassing ImageKit free-tier bandwidth constraints.
2. **Branded HTML Preview Card**: When an image link is opened in a browser tab, it serves a luxury dark glassmorphism preview with custom brand title `${fileName} — Avelor AI CDN` and brand favicon.
3. **Raw Asset Serving**: Permissive CORS (`Access-Control-Allow-Origin: *`, `Cross-Origin-Resource-Policy: cross-origin`) and `immutable` cache control headers for instant loading in storefronts and apps.

## Deployment to Cloudflare

1. Install dependencies & log into Cloudflare:
   ```bash
   bun install
   npx wrangler login
   ```

2. Configure environment variables in `wrangler.jsonc` (or via Cloudflare Dashboard secrets):
   ```jsonc
   {
     "vars": {
       "IMAGEKIT_ENDPOINT": "https://ik.imagekit.io/<your_imagekit_id>",
       "BRAND_NAME": "Avelor AI CDN",
       "ICON_URL": "https://cdn.statiqo.bond/icon.svg"
     }
   }
   ```

3. Deploy:
   ```bash
   bun run deploy
   ```

4. (Optional) Custom Domain:
   In your Cloudflare Dashboard under **Workers & Pages > avelor-cdn > Settings > Triggers > Custom Domains**, attach your custom domain (e.g. `cdn.avelor.store` or `cdn.statiqo.bond`).

