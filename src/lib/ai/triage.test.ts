import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../catalog";
import { AUTO_APPLY_THRESHOLD, shouldAutoApply, triagePrompt, triageSchema } from "./triage";

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
