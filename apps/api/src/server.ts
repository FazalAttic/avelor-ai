import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

console.log(`[Avelor API] Server starting on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
