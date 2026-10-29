import "server-only";
import { aliasedTable, and, avg, count, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { categories, tickets, ticketTriage, users } from "@/db/schema";
import { listAgents, listCategories } from "@/lib/data";
import { AUTO_APPLY_THRESHOLD, pickAgent } from "./triage";

const chosen = aliasedTable(categories, "chosen");

// Tickets waiting for a person to triage: the AI wasn't confident or couldn't run, and nobody has taken them.
const waiting = and(inArray(ticketTriage.outcome, ["review", "failed"]), isNull(tickets.agentId), inArray(tickets.status, ["open", "in_progress"]));

export async function reviewQueue() {
  const [agents, cats] = [await listAgents(), await listCategories()];
  const rows = await db
      .select({
        ticketId: tickets.id,
        subject: tickets.subject,
        description: tickets.description,
        createdAt: tickets.createdAt,
        customerName: users.name,
        currentCategory: chosen.name,
        outcome: ticketTriage.outcome,
        categoryId: ticketTriage.categoryId,
        priority: ticketTriage.priority,
        confidence: ticketTriage.confidence,
        reason: ticketTriage.reason,
      })
      .from(ticketTriage)
      .innerJoin(tickets, eq(ticketTriage.ticketId, tickets.id))
      .innerJoin(users, eq(tickets.customerId, users.id))
      .innerJoin(chosen, eq(tickets.categoryId, chosen.id))
      .where(waiting)
      .orderBy(desc(tickets.createdAt));
  // The predicted category's name comes from the list: Drizzle can't type two joins on categories in one query.
  return rows.map((r) => ({
    ...r,
    category: cats.find((c) => c.id === r.categoryId)?.name ?? null,
    suggestedAgent: r.categoryId ? (pickAgent(agents, r.categoryId)?.name ?? null) : null,
  }));
}

export async function reviewCount() {
  const [row] = await db.select({ n: count() }).from(ticketTriage).innerJoin(tickets, eq(ticketTriage.ticketId, tickets.id)).where(waiting);
  return row.n;
}

// What triage did over the last 30 days, for the admin dashboard.
export async function triageStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ outcome: ticketTriage.outcome, n: count(), latency: avg(ticketTriage.latencyMs) })
    .from(ticketTriage)
    .where(gte(ticketTriage.createdAt, since))
    .groupBy(ticketTriage.outcome);
  const n = (o: string) => rows.find((r) => r.outcome === o)?.n ?? 0;
  const total = rows.reduce((s, r) => s + r.n, 0);
  const ran = rows.filter((r) => r.outcome !== "failed");
  const ranCount = ran.reduce((s, r) => s + r.n, 0);
  const latencyMs = ranCount ? Math.round(ran.reduce((s, r) => s + Number(r.latency ?? 0) * r.n, 0) / ranCount) : null;
  // Auto-applied tickets a person later moved, as a share of everything that was auto-applied.
  const movedAfterAuto = await autoOverridden(since);
  const autoApplied = n("auto") + movedAfterAuto;
  return {
    total,
    auto: n("auto"),
    review: n("review") + n("accepted") + n("failed"),
    overridden: n("overridden"),
    overrideRate: autoApplied ? movedAfterAuto / autoApplied : null,
    latencyMs,
  };
}

// Overridden rows that started as auto-applied (confidence at or above the threshold when they ran).
async function autoOverridden(since: Date) {
  const [row] = await db
    .select({ n: count() })
    .from(ticketTriage)
    .where(and(eq(ticketTriage.outcome, "overridden"), gte(ticketTriage.createdAt, since), gte(ticketTriage.confidence, AUTO_APPLY_THRESHOLD)));
  return row.n;
}
