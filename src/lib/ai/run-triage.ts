import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ticketEvents, tickets, ticketTriage, type Priority, type TriageOutcome } from "@/db/schema";
import { listAgents, listCategories } from "@/lib/data";
import { adminIds, notifyUsers, titled } from "@/lib/notify";
import { AiUnavailableError, logged } from "./logged";
import { aiEnabled, modelId } from "./provider";
import { classifyTicket, pickAgent, settleOutcome, shouldAutoApply } from "./triage";

type By = { byAi: true } | { actorId: string };

// Apply a category and priority to a ticket and assign the least-loaded agent in that category.
// Skips the category move and assignment if someone has already taken the ticket.
export async function applyTriage(ticketId: number, pick: { categoryId: number; priority: Priority }, by: By) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return;
  const cats = await listCategories();
  const name = (id: number) => cats.find((c) => c.id === id)?.name ?? "another category";
  const who = "actorId" in by ? { actorId: by.actorId, byAi: false } : { actorId: null, byAi: true };
  const events: (typeof ticketEvents.$inferInsert)[] = [];

  const moveCategory = !ticket.agentId && pick.categoryId !== ticket.categoryId;
  const changePriority = pick.priority !== ticket.priority;
  if (moveCategory || changePriority) {
    await db
      .update(tickets)
      .set({ ...(moveCategory ? { categoryId: pick.categoryId } : {}), ...(changePriority ? { priority: pick.priority } : {}), updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));
    if (moveCategory) events.push({ ticketId, ...who, type: "category", fromValue: name(ticket.categoryId), toValue: name(pick.categoryId) });
    if (changePriority) events.push({ ticketId, ...who, type: "priority", fromValue: ticket.priority, toValue: pick.priority });
  }

  if (!ticket.agentId) {
    const agent = pickAgent(await listAgents(), pick.categoryId);
    // Only if still unassigned, the same guard claimTicket uses, so a human claim always wins.
    const claimed = agent
      ? await db
          .update(tickets)
          .set({ agentId: agent.id, updatedAt: new Date() })
          .where(and(eq(tickets.id, ticketId), isNull(tickets.agentId)))
          .returning({ id: tickets.id })
      : [];
    if (agent && claimed.length) {
      events.push({ ticketId, ...who, type: "assigned", toValue: agent.name });
      await notifyUsers([agent.id], { ticketId, title: "Ticket assigned to you", body: titled(ticketId, ticket.subject) });
      await notifyUsers([ticket.customerId], { ticketId, title: `${agent.name} is on your ticket`, body: titled(ticketId, ticket.subject) });
    }
  }

  // Spaced a millisecond apart so the timeline shows them in the order they happened.
  const now = Date.now();
  if (events.length) await db.insert(ticketEvents).values(events.map((e, i) => ({ ...e, createdAt: new Date(now + i) })));
}

// Classify a new ticket and either apply the result or leave it for an admin. Never throws:
// it runs after the response (next/server `after`), and any failure just means a person triages it.
export async function triageTicket(ticketId: number) {
  if (!aiEnabled()) return;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return;
  const cats = await listCategories();
  const model = modelId();
  const base = { ticketId, model, customerCategoryId: ticket.categoryId, customerPriority: ticket.priority };

  try {
    const result = await logged({ feature: "triage", model, userId: ticket.customerId, ticketId }, async () => {
      const r = await classifyTicket(ticket, cats);
      return { value: r, usage: r.usage };
    });
    const { triage } = result;
    const category = cats.find((c) => c.slug === triage.category);
    const auto = !!category && shouldAutoApply(triage);
    await db.insert(ticketTriage).values({
      ...base,
      categoryId: category?.id ?? null,
      priority: triage.priority,
      confidence: triage.confidence,
      reason: triage.reason,
      outcome: auto ? "auto" : "review",
      latencyMs: result.latencyMs,
    });
    if (auto) await applyTriage(ticketId, { categoryId: category.id, priority: triage.priority }, { byAi: true });
    else await notifyUsers(await adminIds(), { ticketId, title: "Ticket needs review", body: `Relay AI wasn’t sure: ${titled(ticketId, ticket.subject)}` });
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) console.error(`Triage failed for ticket ${ticketId}`, error);
    await db
      .insert(ticketTriage)
      .values({ ...base, outcome: "failed", reason: error instanceof AiUnavailableError ? error.message : "Relay AI couldn’t classify this ticket." })
      .catch((e) => console.error("Couldn't record failed triage", e));
  }
}

// The ticket's most recent triage run, if any.
export async function latestTriage(ticketId: number) {
  const [row] = await db.select().from(ticketTriage).where(eq(ticketTriage.ticketId, ticketId)).orderBy(desc(ticketTriage.createdAt)).limit(1);
  return row ?? null;
}

// Record that a person confirmed or corrected the AI on this ticket (see settleOutcome).
export async function settleTriage(ticketId: number, chosenCategoryId: number) {
  const row = await latestTriage(ticketId);
  const next = row && settleOutcome(row.outcome, row.categoryId, chosenCategoryId);
  if (row && next) await db.update(ticketTriage).set({ outcome: next }).where(eq(ticketTriage.id, row.id));
}

export async function setTriageOutcome(ticketId: number, from: TriageOutcome[], to: TriageOutcome) {
  const row = await latestTriage(ticketId);
  if (row && from.includes(row.outcome)) await db.update(ticketTriage).set({ outcome: to }).where(eq(ticketTriage.id, row.id));
  return row;
}

// After the nightly demo reset: triage the open, unassigned tickets so the review queue and dashboard
// show real Relay AI output. Spaced out to stay inside the free tier's per-minute limit.
export async function triageWaitingTickets(limit = 8) {
  if (!aiEnabled()) return 0;
  const waiting = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(and(isNull(tickets.agentId), eq(tickets.status, "open")))
    .orderBy(desc(tickets.createdAt))
    .limit(limit);
  for (const [i, t] of waiting.entries()) {
    if (i) await new Promise((r) => setTimeout(r, 4000));
    await triageTicket(t.id);
  }
  return waiting.length;
}
