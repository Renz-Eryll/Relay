// AI reply drafts: a first draft for staff, grounded in how similar tickets were resolved.
// The draft only fills the reply box; a person edits and sends it.
import { generateText, Output } from "ai";
import { z } from "zod";
import type { SimilarTicket } from "./similar";
import { chatModel } from "./provider";

type ThreadMessage = { author: string; staff: boolean; body: string };
export type DraftInput = { subject: string; description: string; customerFirstName: string; agentName: string; thread: ThreadMessage[] };

export function draftPrompt(sources: SimilarTicket[]) {
  return [
    "You draft replies for support agents at Relay, a help desk for business software used by small companies in the Philippines.",
    "Write the next reply from the agent to the customer. The agent will review and edit it before sending.",
    "",
    "Rules:",
    "- Use the resolved tickets below only as evidence of fixes that worked before. Never mention them, their ticket numbers or other customers.",
    "- When one matches, lead with the steps from how it was resolved, adapted to this customer. Ask a question only if those steps need information you don't have.",
    "- Write your own sentences; don't copy replies word for word.",
    "- If they don't cover this problem, don't invent a fix: acknowledge the issue and ask the one or two questions needed to move it forward.",
    "- Don't promise timelines or refunds, and don't claim something is already fixed unless the thread says so.",
    "- Reply in the customer's language (English, Filipino or Taglish), friendly and plain. 2 to 5 short sentences, no subject line, no sign-off.",
    "- usedSourceIds lists the ids of the resolved tickets you actually relied on, or is empty.",
    "",
    sources.length ? "Resolved tickets:" : "No similar resolved tickets were found.",
    ...sources.map((s) => {
      // The last staff reply is usually the fix; earlier ones are questions and context.
      const earlier = s.staffReplies.slice(0, -1);
      return [`\n[${s.id}] ${s.subject}`, `How it was resolved: ${s.staffReplies.at(-1)}`, ...(earlier.length ? [`Earlier agent replies: ${earlier.join(" / ")}`] : [])].join("\n");
    }),
  ].join("\n");
}

export function draftMessage(input: DraftInput) {
  return [
    `Customer: ${input.customerFirstName}. Agent writing the reply: ${input.agentName}.`,
    `Subject: ${input.subject}`,
    "",
    input.description,
    ...input.thread.map((m) => `\n${m.staff ? "Agent" : "Customer"} (${m.author}): ${m.body}`),
  ].join("\n");
}

const draftSchema = z.object({ reply: z.string().min(1).max(1500), usedSourceIds: z.array(z.number().int()) });

export async function generateDraft(input: DraftInput, sources: SimilarTicket[]) {
  const result = await generateText({
    model: chatModel(),
    output: Output.object({ schema: draftSchema, name: "draft" }),
    system: draftPrompt(sources),
    prompt: draftMessage(input),
    maxRetries: 1,
  });
  const out = result.output as z.infer<typeof draftSchema>;
  // Keep only ids that were actually offered, so the UI never links a ticket the model made up.
  const offered = new Set(sources.map((s) => s.id));
  return {
    reply: out.reply.trim(),
    usedSourceIds: out.usedSourceIds.filter((id) => offered.has(id)),
    usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
  };
}
