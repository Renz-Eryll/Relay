import { and, count, eq, gte, ne } from "drizzle-orm";
import { db } from "../../db";
import { aiRequests, type AiFeature } from "../../db/schema";
import { limitMessage } from "./limits";
import { aiEnabled } from "./provider";

// Thrown when AI is switched off or a daily limit is reached. Callers fall back to the non-AI path.
export class AiUnavailableError extends Error {}

type CallMeta = { feature: AiFeature; model: string; userId?: string | null; ticketId?: number | null };
type Usage = { inputTokens?: number; outputTokens?: number };

async function usageToday({ feature, userId }: CallMeta) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = gte(aiRequests.createdAt, since);
  const sitePool = feature === "embed" ? eq(aiRequests.feature, "embed") : ne(aiRequests.feature, "embed");
  const [[site], [user]] = await Promise.all([
    db.select({ n: count() }).from(aiRequests).where(and(recent, sitePool)),
    userId
      ? db.select({ n: count() }).from(aiRequests).where(and(recent, eq(aiRequests.userId, userId), eq(aiRequests.feature, feature)))
      : Promise.resolve([{ n: 0 }]),
  ]);
  return { site: site.n, user: user.n };
}

// Some providers report no usage (Gemini embeddings come back as NaN); store only real counts.
const tokens = (n: number | undefined) => (Number.isFinite(n) ? n! : null);

// Runs one AI call inside the free-tier limits and records it (success or failure) in ai_requests.
export async function logged<T>(meta: CallMeta, call: () => Promise<{ value: T; usage?: Usage }>): Promise<T> {
  if (!aiEnabled()) throw new AiUnavailableError("Relay AI is turned off.");
  const blocked = limitMessage(meta.feature, await usageToday(meta), !!meta.userId);
  if (blocked) throw new AiUnavailableError(blocked);

  const started = Date.now();
  const record = (ok: boolean, usage?: Usage) =>
    db.insert(aiRequests).values({
      feature: meta.feature,
      model: meta.model,
      userId: meta.userId ?? null,
      ticketId: meta.ticketId ?? null,
      ok,
      latencyMs: Date.now() - started,
      inputTokens: tokens(usage?.inputTokens),
      outputTokens: tokens(usage?.outputTokens),
    });

  try {
    const { value, usage } = await call();
    await record(true, usage);
    return value;
  } catch (error) {
    await record(false);
    throw error;
  }
}
