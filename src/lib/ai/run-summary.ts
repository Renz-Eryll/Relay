import { generateText, Output } from "ai";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { messages, tickets, ticketSummaries, users } from "../../db/schema";
import { logged } from "./logged";
import { chatModel, modelId } from "./provider";
import { fromBody, SUMMARY_PROMPT, summaryMessage, summarySchema, toBody, type Summary } from "./summary";

// Summarise the conversation so far and store it. Needs at least one reply to be worth it.
export async function summarizeThread(ticketId: number, userId: string | null = null) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return null;
  const thread = await db
    .select({ id: messages.id, body: messages.body, author: users.name, role: users.role })
    .from(messages)
    .innerJoin(users, eq(messages.authorId, users.id))
    .where(eq(messages.ticketId, ticketId))
    .orderBy(asc(messages.createdAt));
  if (!thread.length) return null;

  const summary = await logged({ feature: "summary", model: modelId(), userId, ticketId }, async () => {
    const r = await generateText({
      model: chatModel(),
      output: Output.object({ schema: summarySchema, name: "handoff_summary" }),
      system: SUMMARY_PROMPT,
      prompt: summaryMessage({
        subject: ticket.subject,
        description: ticket.description,
        thread: thread.map((m) => ({ author: m.author, staff: m.role !== "customer", body: m.body })),
      }),
      maxRetries: 1,
    });
    return { value: r.output as Summary, usage: { inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens } };
  });

  const [row] = await db
    .insert(ticketSummaries)
    .values({ ticketId, upToMessageId: thread.at(-1)!.id, body: toBody(summary) })
    .returning();
  return row;
}

// The latest summary, and how many messages arrived after it.
export async function latestSummary(ticketId: number) {
  const [row] = await db.select().from(ticketSummaries).where(eq(ticketSummaries.ticketId, ticketId)).orderBy(desc(ticketSummaries.createdAt)).limit(1);
  if (!row) return null;
  const newer = await db.select({ id: messages.id }).from(messages).where(eq(messages.ticketId, ticketId));
  return { ...row, lines: fromBody(row.body), newMessages: newer.filter((m) => m.id > (row.upToMessageId ?? 0)).length };
}
