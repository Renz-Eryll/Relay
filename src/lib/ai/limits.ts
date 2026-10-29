import type { AiFeature } from "../../db/schema";

// Daily caps that keep the shared demo inside Gemini's free tier. Rolling 24 hours.
export const DAILY_LIMITS = {
  perUser: { triage: 10, draft: 20, summary: 20, embed: 50 } satisfies Record<AiFeature, number>,
  // Every generation call across the whole site; embeddings have their own, larger pool.
  siteGenerations: 300,
  siteEmbeddings: 600,
};

export type UsageCounts = { user: number; site: number };

// Why a call can't run right now, or null when it can. Kept pure so it can be unit-tested.
export function limitMessage(feature: AiFeature, counts: UsageCounts, hasUser: boolean): string | null {
  const siteCap = feature === "embed" ? DAILY_LIMITS.siteEmbeddings : DAILY_LIMITS.siteGenerations;
  if (counts.site >= siteCap) return "Relay AI has reached today’s limit for the demo. It resets within 24 hours.";
  if (hasUser && counts.user >= DAILY_LIMITS.perUser[feature]) return "You’ve reached today’s limit for this AI feature. Try again tomorrow.";
  return null;
}
