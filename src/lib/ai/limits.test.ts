import { describe, expect, it } from "vitest";
import { DAILY_LIMITS, limitMessage } from "./limits";

describe("limitMessage", () => {
  it("allows calls under every limit", () => {
    expect(limitMessage("draft", { user: 0, site: 0 }, true)).toBeNull();
  });

  it("blocks a user who has used up their daily drafts", () => {
    expect(limitMessage("draft", { user: DAILY_LIMITS.perUser.draft, site: 1 }, true)).toMatch(/limit for this AI feature/);
  });

  it("ignores per-user counts for background calls with no user", () => {
    expect(limitMessage("triage", { user: 999, site: 0 }, false)).toBeNull();
  });

  it("blocks everyone once the site-wide pool is used up", () => {
    expect(limitMessage("summary", { user: 0, site: DAILY_LIMITS.siteGenerations }, true)).toMatch(/demo/i);
  });

  it("gives embeddings their own site pool", () => {
    expect(limitMessage("embed", { user: 0, site: DAILY_LIMITS.siteGenerations }, false)).toBeNull();
    expect(limitMessage("embed", { user: 0, site: DAILY_LIMITS.siteEmbeddings }, false)).not.toBeNull();
  });
});
