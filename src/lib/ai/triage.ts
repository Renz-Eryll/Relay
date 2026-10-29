// Auto-triage: predict a ticket's category and priority, with a confidence the app can act on.
// classifyTicket is pure (no database), so production and the eval script run the same code.
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Priority, TriageOutcome } from "../../db/schema";
import { PRIORITY_HINT } from "../labels";
import { chatModel, modelId } from "./provider";

export type CategoryInfo = { slug: string; name: string; description: string };
export type TicketText = { subject: string; description: string };
export type Triage = { category: string; priority: Priority; confidence: number; reason: string };

const PRIORITIES = Object.keys(PRIORITY_HINT) as Priority[];

// How Relay's teams split the work, beyond the one-line category descriptions. Same rules as the eval's
// labelling guide (evals/triage/README.md). Keyed by slug; categories without notes just use their description.
const ROUTING_NOTES: Record<string, string> = {
  pos: "Registers, checkout prices, receipts and receipt printers, card or QR payments at the counter, cashier logins, promos, loyalty, refunds.",
  inventory: "The item master and syncing items or prices to branches, stock levels and stock deductions, receiving, transfers, counts, units, expiry.",
  accounting: "The company's own books: invoices it issues, journal and ledger postings (including postings that come from POS or billing), bank feeds and reconciliation, BIR returns, AR/AP, closing.",
  billing: "Utilities (such as water districts) billing their own customers: meter readings, bill generation and printing, billing cycles, tariffs, penalties, disconnection and reconnection, collections reports, and customer payments or bank payment files posting to customer accounts.",
  payroll: "Employees: payslips, attendance and DTR, leave, overtime and holiday pay, salary tax and government contributions, payroll bank files, 13th month.",
};

export function triagePrompt(categories: CategoryInfo[]) {
  return [
    "You triage support tickets for Relay, a help desk for business software used by small companies in the Philippines.",
    "Customers write in English, Filipino or Taglish. Read past the language and focus on what is broken or requested.",
    "",
    "Pick the ONE category whose team would fix this ticket:",
    ...categories.map((c) => `- ${c.slug}: ${c.name}. ${c.description}${ROUTING_NOTES[c.slug] ? ` Covers: ${ROUTING_NOTES[c.slug]}` : ""}`),
    "If a ticket touches several areas, choose the area where the fix has to happen, not where the symptom was noticed.",
    "",
    "Pick the priority from the business impact the customer describes:",
    ...PRIORITIES.map((p) => `- ${p}: ${PRIORITY_HINT[p]}`),
    "Words like 'urgent' or 'ASAP' alone don't make a ticket urgent; judge the impact. Questions and how-to requests are low.",
    "",
    "confidence is your probability (0 to 1) that the category is right. Use low values when the ticket is vague or fits two categories.",
    "reason is one short sentence a support agent can read, without repeating the ticket.",
  ].join("\n");
}

export function triageSchema(categories: CategoryInfo[]) {
  return z.object({
    category: z.enum(categories.map((c) => c.slug) as [string, ...string[]]),
    priority: z.enum(PRIORITIES as [Priority, ...Priority[]]),
    confidence: z.number().min(0).max(1),
    reason: z.string().max(240),
  });
}

export async function classifyTicket(ticket: TicketText, categories: CategoryInfo[], opts: { maxRetries?: number } = {}) {
  const started = Date.now();
  const result = await generateText({
    model: chatModel(),
    output: Output.object({ schema: triageSchema(categories), name: "triage" }),
    system: triagePrompt(categories),
    prompt: `Subject: ${ticket.subject}\n\n${ticket.description}`,
    maxRetries: opts.maxRetries ?? 2,
  });
  return {
    triage: result.output as Triage,
    model: modelId(),
    latencyMs: Date.now() - started,
    usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
  };
}

// Whether a prediction is confident enough to act on without a person. On the eval's dev split every category
// was right at every threshold, so this keeps a margin (0.9 still auto-applied 97.5% of dev tickets) rather
// than taking the lowest value; the held-out test split reports how it actually performs.
export const AUTO_APPLY_THRESHOLD = 0.9;
export const shouldAutoApply = (t: Pick<Triage, "confidence">, threshold = AUTO_APPLY_THRESHOLD) => t.confidence >= threshold;

// The agent Relay AI assigns: the least-loaded agent in the category (ties go to the first by name).
// A rule in code rather than a model choice, so it's predictable and easy to explain.
export function pickAgent<A extends { categoryId: number | null; active: number }>(agents: A[], categoryId: number): A | null {
  return agents.filter((a) => a.categoryId === categoryId).reduce<A | null>((best, a) => (!best || a.active < best.active ? a : best), null);
}

// When a person acts on a triaged ticket, whether that confirms or corrects the AI. null = leave it as it is.
// Feeds the override rate on the dashboard.
export function settleOutcome(current: TriageOutcome, predictedCategoryId: number | null, chosenCategoryId: number): TriageOutcome | null {
  if (current === "review" || current === "failed") return predictedCategoryId === chosenCategoryId ? "accepted" : "overridden";
  if (current === "auto" && predictedCategoryId !== chosenCategoryId) return "overridden";
  return null;
}
