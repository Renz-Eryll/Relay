import { describe, expect, it } from "vitest";
import { keywordBaseline, pickThreshold, score, thresholdTable, type Example, type Prediction } from "./metrics";

const ex = (id: string, category: string, priority: Example["priority"], tags: string[] = []): Example => ({
  id,
  subject: "",
  description: "",
  category,
  priority,
  tags,
  split: "dev",
});
const pred = (id: string, category: string, priority: Prediction["priority"], confidence: number): Prediction => ({ id, category, priority, confidence });

const examples = [ex("a", "pos", "high"), ex("b", "inventory", "low", ["vague"]), ex("c", "billing", "urgent", ["ambiguous"]), ex("d", "payroll", "medium")];
const predictions = [pred("a", "pos", "high", 0.95), pred("b", "pos", "medium", 0.4), pred("c", "billing", "medium", 0.9), pred("d", "payroll", "medium", 0.85)];

describe("score", () => {
  const s = score(examples, predictions);

  it("measures category and priority accuracy", () => {
    expect(s.n).toBe(4);
    expect(s.categoryAccuracy).toBe(0.75);
    expect(s.priorityExact).toBe(0.5);
    // b is one level off; c (urgent vs medium) is two levels off.
    expect(s.priorityWithinOne).toBe(0.75);
  });

  it("builds a confusion matrix of gold vs predicted category", () => {
    expect(s.confusion.inventory).toEqual({ pos: 1 });
    expect(s.confusion.pos).toEqual({ pos: 1 });
  });

  it("breaks accuracy down by tag, counting untagged examples as plain", () => {
    expect(s.byTag.find((t) => t.tag === "vague")).toEqual({ tag: "vague", n: 1, categoryAccuracy: 0 });
    expect(s.byTag.find((t) => t.tag === "plain")?.n).toBe(2);
  });

  it("reports examples that have no prediction yet", () => {
    expect(score(examples, predictions.slice(0, 2)).missing).toBe(2);
  });
});

describe("thresholds", () => {
  const table = thresholdTable(examples, predictions, [0.3, 0.8, 0.9]);

  it("trades coverage for accuracy as the threshold rises", () => {
    expect(table[0]).toMatchObject({ threshold: 0.3, coverage: 1, autoAccuracy: 0.75 });
    expect(table[1]).toMatchObject({ threshold: 0.8, coverage: 0.75, autoAccuracy: 1 });
  });

  it("picks the lowest threshold that reaches the target", () => {
    expect(pickThreshold(table, 0.95, 2)).toBe(0.8);
    expect(pickThreshold(table, 0.95, 10)).toBeNull();
  });
});

describe("keywordBaseline", () => {
  it("picks the category with the most keyword hits", () => {
    expect(keywordBaseline({ subject: "Payslip shows wrong SSS deduction", description: "" })).toBe("payroll");
    expect(keywordBaseline({ subject: "Stock transfer to warehouse", description: "" })).toBe("inventory");
  });

  it("falls back when nothing matches", () => {
    expect(keywordBaseline({ subject: "Help", description: "Nothing works" })).toBe("pos");
  });
});
