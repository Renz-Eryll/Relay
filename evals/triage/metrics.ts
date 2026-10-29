// Scoring for the triage eval. Pure functions, unit-tested in metrics.test.ts.

export type Priority = "low" | "medium" | "high" | "urgent";
export type Example = { id: string; subject: string; description: string; category: string; priority: Priority; tags: string[]; split: "dev" | "test" };
export type Prediction = { id: string; category: string; priority: Priority; confidence: number; reason?: string; latencyMs?: number };

const RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };
const pct = (n: number, d: number) => (d ? n / d : 0);

export function score(examples: Example[], predictions: Prediction[]) {
  const byId = new Map(predictions.map((p) => [p.id, p]));
  const scored = examples.filter((e) => byId.has(e.id)).map((e) => ({ e, p: byId.get(e.id)! }));
  const n = scored.length;
  const categoryHits = scored.filter(({ e, p }) => e.category === p.category).length;
  const priorityHits = scored.filter(({ e, p }) => e.priority === p.priority).length;
  const priorityNear = scored.filter(({ e, p }) => Math.abs(RANK[e.priority] - RANK[p.priority]) <= 1).length;
  return {
    n,
    missing: examples.length - n,
    categoryAccuracy: pct(categoryHits, n),
    priorityExact: pct(priorityHits, n),
    priorityWithinOne: pct(priorityNear, n),
    byTag: byTag(scored),
    confusion: confusion(scored),
  };
}

// Category accuracy for each tag (ambiguous, taglish, vague, multi-issue, plain).
function byTag(scored: { e: Example; p: Prediction }[]) {
  const tags = [...new Set(scored.flatMap(({ e }) => (e.tags.length ? e.tags : ["plain"])))].sort();
  return tags.map((tag) => {
    const rows = scored.filter(({ e }) => (e.tags.length ? e.tags.includes(tag) : tag === "plain"));
    return { tag, n: rows.length, categoryAccuracy: pct(rows.filter(({ e, p }) => e.category === p.category).length, rows.length) };
  });
}

// confusion[gold][predicted] = count
function confusion(scored: { e: Example; p: Prediction }[]) {
  const m: Record<string, Record<string, number>> = {};
  for (const { e, p } of scored) {
    m[e.category] ??= {};
    m[e.category][p.category] = (m[e.category][p.category] ?? 0) + 1;
  }
  return m;
}

// For each confidence threshold: how many tickets would be auto-applied (coverage) and how often those are right.
export function thresholdTable(examples: Example[], predictions: Prediction[], thresholds = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]) {
  const gold = new Map(examples.map((e) => [e.id, e]));
  const rows = predictions.filter((p) => gold.has(p.id));
  return thresholds.map((t) => {
    const auto = rows.filter((p) => p.confidence >= t);
    const right = auto.filter((p) => gold.get(p.id)!.category === p.category).length;
    return { threshold: t, coverage: pct(auto.length, rows.length), autoAccuracy: pct(right, auto.length), autoCount: auto.length };
  });
}

// Lowest threshold whose auto-applied tickets reach the target accuracy (with at least `minCount` of them).
export function pickThreshold(table: ReturnType<typeof thresholdTable>, target = 0.95, minCount = 5) {
  return table.find((r) => r.autoCount >= minCount && r.autoAccuracy >= target)?.threshold ?? null;
}

// The non-AI baseline: count category keywords in the text and pick the most frequent.
export const KEYWORDS: Record<string, string[]> = {
  pos: ["pos", "cashier", "receipt", "printer", "checkout", "discount", "promo", "terminal", "sale", "register", "void", "barcode label"],
  inventory: ["stock", "inventory", "warehouse", "transfer", "item", "sku", "supplier", "reorder", "delivery", "scanner", "expiry", "count"],
  accounting: ["invoice", "ledger", "journal", "bank", "reconcil", "bir", "vat", "tax", "accounting", "expense", "audit", "financial"],
  billing: ["meter", "bill", "billing", "consumption", "water", "disconnection", "zone", "reading", "account number", "payment posting", "concessionaire"],
  payroll: ["payroll", "payslip", "salary", "sss", "philhealth", "pag-ibig", "leave", "attendance", "overtime", "employee", "13th month", "dtr"],
};

export function keywordBaseline(e: Pick<Example, "subject" | "description">, keywords = KEYWORDS, fallback = "pos") {
  const text = `${e.subject} ${e.description}`.toLowerCase();
  let best = fallback;
  let bestHits = 0;
  for (const [cat, words] of Object.entries(keywords)) {
    const hits = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
    if (hits > bestHits) [best, bestHits] = [cat, hits];
  }
  return best;
}
