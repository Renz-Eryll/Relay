// Which models Relay AI uses. Swapping provider (or model) is a change to this file only.
// Relative imports and no "server-only": the seed and eval scripts run this through tsx.
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

// Pinned (not "-latest") so eval numbers stay reproducible. Override with AI_MODEL.
export const modelId = () => process.env.AI_MODEL || "gemini-3.5-flash";

// GEMINI_API_KEY is the name Google uses; the AI SDK's default name works too.
const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// The kill switch: no key (or AI_ENABLED=false) and Relay behaves exactly as it did before AI.
export const aiEnabled = () => !!apiKey() && process.env.AI_ENABLED !== "false";

const google = () => createGoogleGenerativeAI({ apiKey: apiKey() });
export const chatModel = () => google()(modelId());
export const embeddingModel = () => google().embeddingModel(EMBEDDING_MODEL);

// Shared by every embed call so documents and queries live in the same vector space.
export const embeddingOptions = { google: { outputDimensionality: EMBEDDING_DIMENSIONS } };
