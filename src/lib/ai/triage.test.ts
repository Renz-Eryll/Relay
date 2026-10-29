import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../catalog";
import { AUTO_APPLY_THRESHOLD, pickAgent, settleOutcome, shouldAutoApply, triagePrompt, triageSchema } from "./triage";

describe("triageSchema", () => {
  const schema = triageSchema(CATEGORIES);
  const valid = { category: "pos", priority: "high", confidence: 0.9, reason: "Card payments fail at the counter." };

  it("accepts a well-formed prediction", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects categories and priorities Relay doesn't have", () => {
    expect(schema.safeParse({ ...valid, category: "marketing" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, priority: "critical" }).success).toBe(false);
  });

  it("keeps confidence between 0 and 1", () => {
    expect(schema.safeParse({ ...valid, confidence: 1.4 }).success).toBe(false);
  });
});

describe("triagePrompt", () => {
  it("lists every category and every priority so the model can only choose real ones", () => {
    const prompt = triagePrompt(CATEGORIES);
    for (const c of CATEGORIES) expect(prompt).toContain(`${c.slug}: ${c.name}`);
    for (const p of ["low", "medium", "high", "urgent"]) expect(prompt).toContain(`- ${p}:`);
  });
});

describe("shouldAutoApply", () => {
  it("applies predictions at or above the threshold and sends the rest to a person", () => {
    expect(shouldAutoApply({ confidence: AUTO_APPLY_THRESHOLD })).toBe(true);
    expect(shouldAutoApply({ confidence: AUTO_APPLY_THRESHOLD - 0.01 })).toBe(false);
    expect(shouldAutoApply({ confidence: 0.7 }, 0.6)).toBe(true);
  });
});

describe("pickAgent", () => {
  const agents = [
    { id: "ana", categoryId: 1, active: 3 },
    { id: "ben", categoryId: 1, active: 1 },
    { id: "cy", categoryId: 1, active: 1 },
    { id: "dee", categoryId: 2, active: 0 },
  ];

  it("picks the least-loaded agent in the category, keeping the first on a tie", () => {
    expect(pickAgent(agents, 1)?.id).toBe("ben");
  });

  it("returns null when the category has no agents", () => {
    expect(pickAgent(agents, 3)).toBeNull();
  });
});

describe("settleOutcome", () => {
  it("counts a reviewed ticket as accepted when the person picks the AI's category", () => {
    expect(settleOutcome("review", 2, 2)).toBe("accepted");
    expect(settleOutcome("review", 2, 4)).toBe("overridden");
    expect(settleOutcome("failed", null, 4)).toBe("overridden");
  });

  it("marks an auto-applied ticket as overridden only when someone moves it", () => {
    expect(settleOutcome("auto", 2, 2)).toBeNull();
    expect(settleOutcome("auto", 2, 5)).toBe("overridden");
  });

  it("leaves settled outcomes alone", () => {
    expect(settleOutcome("accepted", 2, 5)).toBeNull();
    expect(settleOutcome("overridden", 2, 2)).toBeNull();
  });
});
