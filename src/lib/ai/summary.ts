// Handoff summaries: a three-line catch-up for the agent who picks up a ticket mid-conversation.
// Pure (no database) so it can be unit-tested; run-summary.ts generates and stores summaries.
import { z } from "zod";

type Line = { author: string; staff: boolean; body: string };
export type SummaryInput = { subject: string; description: string; thread: Line[] };

export const SUMMARY_PROMPT = [
  "You write a catch-up for a support agent who is taking over a ticket from someone else.",
  "Fill three short fields, each one plain sentence of at most 25 words, in English:",
  "- problem: what the customer needs, with the key specifics (what fails, where, since when).",
  "- tried: what has been asked, checked or attempted so far, and what the customer answered. 'Nothing yet.' if nothing.",
  "- next: the single most useful next step for the new agent.",
  "Use only what is in the ticket. Don't invent details, and don't add greetings or advice beyond the next step.",
].join("\n");

export function summaryMessage(input: SummaryInput) {
  return [`Subject: ${input.subject}`, "", input.description, ...input.thread.map((m) => `\n${m.staff ? "Agent" : "Customer"} (${m.author}): ${m.body}`)].join("\n");
}

export const summarySchema = z.object({ problem: z.string().min(1).max(300), tried: z.string().min(1).max(300), next: z.string().min(1).max(300) });
export type Summary = z.infer<typeof summarySchema>;

// Stored as three labelled lines so the UI can render them without parsing JSON.
export const toBody = (s: Summary) => `Problem: ${s.problem}\nTried: ${s.tried}\nNext: ${s.next}`;
export function fromBody(body: string): { label: string; text: string }[] {
  return body
    .split("\n")
    .map((line) => line.match(/^(Problem|Tried|Next): (.*)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(([, label, text]) => ({ label, text }));
}
