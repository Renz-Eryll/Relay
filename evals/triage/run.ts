// Triage eval: runs the production classifier over the labelled dataset and writes a report.
//   npm run eval:triage                     dev split (prompt tuning, threshold)
//   npm run eval:triage -- --test --confirm-test   held-out test split: run once, for the README
//   npm run eval:triage -- --limit 5        quick smoke run
// Free tier: calls are spaced out (EVAL_DELAY_MS, default 5000) and 429s back off. Results are saved after
// every ticket, so a run that hits the daily quota can be resumed the next day.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES } from "../../src/lib/catalog";
import { classifyTicket } from "../../src/lib/ai/triage";
import { modelId } from "../../src/lib/ai/provider";
import { keywordBaseline, pickThreshold, score, thresholdTable, type Example, type Prediction } from "./metrics";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const split = args.includes("--test") ? "test" : "dev";
const limit = Number(args[args.indexOf("--limit") + 1]) || Infinity;
const delayMs = Number(process.env.EVAL_DELAY_MS ?? 5000);

if (split === "test" && !args.includes("--confirm-test")) {
  console.error("The test split is held out: tune on dev, then run it once with --test --confirm-test.");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const percent = (x: number) => `${(x * 100).toFixed(1)}%`;

const examples: Example[] = readFileSync(join(here, "dataset.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((e: Example) => e.split === split)
  .slice(0, limit);

const model = modelId();
const outDir = join(here, "results");
mkdirSync(outDir, { recursive: true });
const resultsPath = join(outDir, `${model}-${split}.json`);
const predictions: Prediction[] = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : [];
const done = new Set(predictions.map((p) => p.id));
const save = () => writeFileSync(resultsPath, JSON.stringify(predictions, null, 2) + "\n");

// Free-tier quota (429) and temporary overload (503, "high demand") are worth waiting out.
const isRetryable = (e: unknown) => /429|503|quota|rate limit|resource.?exhausted|high demand|overloaded|unavailable/i.test(String((e as Error)?.message ?? e));

async function classifyWithBackoff(e: Example) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await classifyTicket(e, CATEGORIES, { maxRetries: 0 });
    } catch (error) {
      if (!isRetryable(error) || attempt === 3) throw error;
      const wait = 30_000 * (attempt + 1);
      console.log(`  busy or rate limited, waiting ${wait / 1000}s…`);
      await sleep(wait);
    }
  }
  throw new Error("unreachable");
}

const todo = examples.filter((e) => !done.has(e.id));
console.log(`${model} · ${split} split · ${examples.length} tickets (${todo.length} to run, ${done.size} saved)`);

for (const [i, e] of todo.entries()) {
  try {
    const { triage, latencyMs } = await classifyWithBackoff(e);
    predictions.push({ id: e.id, ...triage, latencyMs });
    save();
    const mark = triage.category === e.category ? "✓" : "✗";
    console.log(`${String(i + 1).padStart(3)}/${todo.length} ${mark} ${e.id.padEnd(14)} → ${triage.category.padEnd(10)} ${triage.priority.padEnd(6)} ${triage.confidence.toFixed(2)}`);
  } catch (error) {
    console.error(`Stopped at ${e.id}: ${String((error as Error).message).slice(0, 200)}`);
    console.error("Saved results are kept; run the same command again to resume.");
    break;
  }
  if (i < todo.length - 1) await sleep(delayMs);
}

// ---- Report ----
const s = score(examples, predictions);
const baseline = score(
  examples,
  examples.map((e) => ({ id: e.id, category: keywordBaseline(e), priority: "medium" as const, confidence: 1 })),
);
const table = thresholdTable(examples, predictions);
const threshold = pickThreshold(table, 0.95);
const latencies = predictions.filter((p) => examples.some((e) => e.id === p.id) && p.latencyMs).map((p) => p.latencyMs!).sort((a, b) => a - b);
const median = latencies[Math.floor(latencies.length / 2)] ?? 0;
const slugs = CATEGORIES.map((c) => c.slug);
const misses = examples.filter((e) => {
  const p = predictions.find((x) => x.id === e.id);
  return p && p.category !== e.category;
});

const report = `# Triage eval: ${model}, ${split} split

Run ${new Date().toISOString().slice(0, 10)} · ${s.n} of ${examples.length} tickets scored${s.missing ? ` (${s.missing} missing)` : ""} · median latency ${median} ms

| Metric | Relay AI | Keyword baseline |
| --- | --- | --- |
| Category accuracy | **${percent(s.categoryAccuracy)}** | ${percent(baseline.categoryAccuracy)} |
| Priority, exact | ${percent(s.priorityExact)} | ${percent(baseline.priorityExact)} (always "medium") |
| Priority, within one level | ${percent(s.priorityWithinOne)} | ${percent(baseline.priorityWithinOne)} |

## Confidence threshold

Tickets at or above the threshold are applied automatically; the rest go to a person.
${threshold === null ? "No threshold reached 95% accuracy on at least 5 tickets." : `Lowest threshold with ≥ 95% accuracy on auto-applied tickets: **${threshold}**.`}

| Threshold | Auto-applied | Accuracy when auto-applied |
| --- | --- | --- |
${table.map((r) => `| ${r.threshold} | ${percent(r.coverage)} (${r.autoCount}) | ${r.autoCount ? percent(r.autoAccuracy) : "—"} |`).join("\n")}

## Category accuracy by ticket type

| Type | Tickets | Accuracy |
| --- | --- | --- |
${s.byTag.map((t) => `| ${t.tag} | ${t.n} | ${percent(t.categoryAccuracy)} |`).join("\n")}

## Confusion (rows: correct category, columns: predicted)

| | ${slugs.join(" | ")} |
| --- | ${slugs.map(() => "---").join(" | ")} |
${slugs.map((g) => `| **${g}** | ${slugs.map((p) => s.confusion[g]?.[p] ?? 0).join(" | ")} |`).join("\n")}

## Misses

${misses.length ? misses.map((e) => { const p = predictions.find((x) => x.id === e.id)!; return `- \`${e.id}\` ${e.subject}: predicted **${p.category}** (${p.confidence.toFixed(2)}), ${p.reason ?? ""}`; }).join("\n") : "None."}
`;

writeFileSync(join(outDir, `${model}-${split}.md`), report);
console.log(`\nCategory ${percent(s.categoryAccuracy)} (baseline ${percent(baseline.categoryAccuracy)}) · priority exact ${percent(s.priorityExact)}, within one ${percent(s.priorityWithinOne)} · threshold ${threshold ?? "none"}`);
console.log(`Report: evals/triage/results/${model}-${split}.md`);
