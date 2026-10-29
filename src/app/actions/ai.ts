"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { messages, tickets, users } from "@/db/schema";
import { generateDraft } from "@/lib/ai/draft";
import { AiUnavailableError, logged } from "@/lib/ai/logged";
import { modelId } from "@/lib/ai/provider";
import { findSimilarResolved } from "@/lib/ai/similar";
import { applyTriage, latestTriage, setTriageOutcome } from "@/lib/ai/run-triage";
import { ActionError, actor, runAction, type ActionState } from "@/lib/auth";
import { canReply } from "@/lib/permissions";

const touch = (ticketId: number) => {
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/", "layout");
};

// Admin accepts Relay AI's suggestion for a ticket waiting in review.
export async function acceptTriage(ticketId: number, _: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor("admin");
    const triage = await latestTriage(ticketId);
    if (!triage || (triage.outcome !== "review" && triage.outcome !== "failed")) throw new ActionError("This ticket isn’t waiting for review.");
    if (!triage.categoryId || !triage.priority) throw new ActionError("Relay AI has no suggestion for this ticket. Assign it from the ticket page.");

    await applyTriage(ticketId, { categoryId: triage.categoryId, priority: triage.priority }, { actorId: user.id });
    await setTriageOutcome(ticketId, ["review", "failed"], "accepted");
    touch(ticketId);
    return { ok: "Suggestion applied" };
  });
}

// Admin dismisses the suggestion and will triage the ticket by hand.
export async function dismissTriage(ticketId: number, _: ActionState): Promise<ActionState> {
  return runAction(async () => {
    await actor("admin");
    const triage = await setTriageOutcome(ticketId, ["review", "failed"], "overridden");
    if (!triage) throw new ActionError("This ticket isn’t waiting for review.");
    touch(ticketId);
    return { ok: "Dismissed. Triage it from the ticket page." };
  });
}

export type DraftSource = { id: number; subject: string; similarity: number; snippet: string };
export type DraftResult = { error: string } | { reply: string; sources: DraftSource[] };

// Staff: a first draft of the next reply, grounded in similar resolved tickets. Fills the reply box only.
export async function draftReply(ticketId: number): Promise<DraftResult> {
  const user = await actor("agent", "admin").catch(() => null);
  if (!user) return { error: "Only staff can draft replies." };
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket || !canReply(user, ticket)) return { error: "You can’t reply to this ticket." };

  const thread = await db
    .select({ body: messages.body, author: users.name, role: users.role })
    .from(messages)
    .innerJoin(users, eq(messages.authorId, users.id))
    .where(eq(messages.ticketId, ticketId))
    .orderBy(asc(messages.createdAt));
  const [customer] = await db.select({ name: users.name }).from(users).where(eq(users.id, ticket.customerId));

  try {
    const sources = await findSimilarResolved(ticketId);
    const draft = await logged({ feature: "draft", model: modelId(), userId: user.id, ticketId }, async () => {
      const d = await generateDraft(
        {
          subject: ticket.subject,
          description: ticket.description,
          customerFirstName: customer?.name.split(" ")[0] ?? "there",
          agentName: user.name,
          thread: thread.map((m) => ({ author: m.author, staff: m.role !== "customer", body: m.body })),
        },
        sources,
      );
      return { value: d, usage: d.usage };
    });
    return {
      reply: draft.reply,
      sources: sources
        .filter((s) => draft.usedSourceIds.includes(s.id))
        .map((s) => ({ id: s.id, subject: s.subject, similarity: s.similarity, snippet: s.staffReplies.at(-1)!.slice(0, 220) })),
    };
  } catch (error) {
    if (error instanceof AiUnavailableError) return { error: error.message };
    console.error(`Draft failed for ticket ${ticketId}`, error);
    return { error: "Relay AI couldn’t draft a reply right now. Try again in a minute." };
  }
}
