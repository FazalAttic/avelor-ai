import {
  createProductionChatModel,
  createProductionEmbeddingModel,
  createProductionGuardrail,
} from "@avelor/ai";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);

const chatModel = createProductionChatModel();
const embeddingModel = createProductionEmbeddingModel();
const guardrail = createProductionGuardrail();

const app = createApp({
  chatModel,
  embeddingModel,
  guardrail,
});

console.log(`[Avelor API] Server starting on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
