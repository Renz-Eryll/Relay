import "server-only";
import { notFound } from "next/navigation";
import { aliasedTable, and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, messages, notifications, ticketEvents, tickets, users, type Priority, type Status } from "@/db/schema";
import { canView } from "./permissions";

type Viewer = { id: string; role: "customer" | "agent" | "admin"; categoryId: number | null };

const customer = aliasedTable(users, "customer");
const agent = aliasedTable(users, "agent");

// The tickets a user may see, as a SQL condition.
function visibleTo(v: Viewer): SQL | undefined {
  if (v.role === "admin") return undefined;
  if (v.role === "customer") return eq(tickets.customerId, v.id);
  return or(
    eq(tickets.agentId, v.id),
    v.categoryId ? and(isNull(tickets.agentId), eq(tickets.categoryId, v.categoryId)) : sql`false`,
  );
}

export type TicketFilters = {
  status?: Status | "active";
  priority?: Priority;
  category?: string;
  q?: string;
  scope?: "mine" | "unassigned";
  page?: number;
};

export const PAGE_SIZE = 20;

export async function listTickets(v: Viewer, f: TicketFilters = {}) {
  const where = and(
    visibleTo(v),
    f.status === "active" ? inArray(tickets.status, ["open", "in_progress"]) : f.status ? eq(tickets.status, f.status) : undefined,
    f.priority ? eq(tickets.priority, f.priority) : undefined,
    f.category ? eq(categories.slug, f.category) : undefined,
    f.scope === "mine" ? eq(tickets.agentId, v.id) : f.scope === "unassigned" ? isNull(tickets.agentId) : undefined,
    f.q
      ? or(
          ilike(tickets.subject, `%${f.q}%`),
          ilike(customer.name, `%${f.q}%`),
          /^\d+$/.test(f.q.replace("#", "")) ? eq(tickets.id, Number(f.q.replace("#", ""))) : undefined,
        )
      : undefined,
  );
  const page = Math.max(1, f.page ?? 1);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        category: categories.name,
        customerName: customer.name,
        agentName: agent.name,
        agentId: tickets.agentId,
      })
      .from(tickets)
      .innerJoin(categories, eq(tickets.categoryId, categories.id))
      .innerJoin(customer, eq(tickets.customerId, customer.id))
      .leftJoin(agent, eq(tickets.agentId, agent.id))
      .where(where)
      .orderBy(desc(tickets.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(tickets)
      .innerJoin(categories, eq(tickets.categoryId, categories.id))
      .innerJoin(customer, eq(tickets.customerId, customer.id))
      .where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getTicket(v: Viewer, id: number) {
  if (!Number.isInteger(id) || id < 1) notFound();
  const [found] = await db
    .select({ ticket: tickets, category: categories })
    .from(tickets)
    .innerJoin(categories, eq(tickets.categoryId, categories.id))
    .where(eq(tickets.id, id));
  // Tickets you can't see look exactly like tickets that don't exist.
  if (!found || !canView(v, found.ticket)) notFound();

  const people = await db
    .select({ id: users.id, name: users.name, email: users.email, company: users.company })
    .from(users)
    .where(inArray(users.id, [found.ticket.customerId, ...(found.ticket.agentId ? [found.ticket.agentId] : [])]));
  const person = (pid: string | null) => people.find((p) => p.id === pid) ?? null;
  const row = { ...found, customer: person(found.ticket.customerId)!, agent: person(found.ticket.agentId) };

  const [thread, events] = await Promise.all([
    db
      .select({ id: messages.id, body: messages.body, createdAt: messages.createdAt, authorId: users.id, authorName: users.name, authorRole: users.role })
      .from(messages)
      .innerJoin(users, eq(messages.authorId, users.id))
      .where(eq(messages.ticketId, id))
      .orderBy(asc(messages.createdAt)),
    db
      .select({ id: ticketEvents.id, type: ticketEvents.type, fromValue: ticketEvents.fromValue, toValue: ticketEvents.toValue, byAi: ticketEvents.byAi, createdAt: ticketEvents.createdAt, actorName: users.name })
      .from(ticketEvents)
      .leftJoin(users, eq(ticketEvents.actorId, users.id))
      .where(eq(ticketEvents.ticketId, id))
      .orderBy(asc(ticketEvents.createdAt)),
  ]);
  return { ...row, thread, events };
}

// Ticket counts by status for whatever the viewer can see (optionally only their assignments).
export async function statusCounts(v: Viewer, opts: { mine?: boolean } = {}) {
  const rows = await db
    .select({ status: tickets.status, n: count() })
    .from(tickets)
    .where(and(visibleTo(v), opts.mine ? eq(tickets.agentId, v.id) : undefined))
    .groupBy(tickets.status);
  const counts: Record<Status, number> = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}

export async function categoryBreakdown() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      open: sql<number>`count(${tickets.id}) filter (where ${tickets.status} in ('open','in_progress'))`.mapWith(Number),
      unassigned: sql<number>`count(${tickets.id}) filter (where ${tickets.status} in ('open','in_progress') and ${tickets.agentId} is null)`.mapWith(Number),
      total: sql<number>`count(${tickets.id})`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(tickets, eq(tickets.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.id));
}

export const listCategories = () => db.select().from(categories).orderBy(asc(categories.id));

export async function listAgents() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isDemo: users.isDemo,
      categoryId: users.categoryId,
      category: categories.name,
      createdAt: users.createdAt,
      active: sql<number>`(select count(*) from ${tickets} where ${tickets.agentId} = ${users.id} and ${tickets.status} in ('open','in_progress'))`.mapWith(Number),
      resolved: sql<number>`(select count(*) from ${tickets} where ${tickets.agentId} = ${users.id} and ${tickets.status} in ('resolved','closed'))`.mapWith(Number),
    })
    .from(users)
    .leftJoin(categories, eq(users.categoryId, categories.id))
    .where(eq(users.role, "agent"))
    .orderBy(asc(users.name));
}

// Average time from creation to resolution over the last 30 days.
export async function avgResolutionMs(v: Viewer, opts: { mine?: boolean } = {}) {
  const [row] = await db
    .select({ ms: sql<number | null>`avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt})) * 1000)` })
    .from(tickets)
    .where(and(visibleTo(v), opts.mine ? eq(tickets.agentId, v.id) : undefined, sql`${tickets.resolvedAt} > now() - interval '30 days'`));
  return row?.ms == null ? null : Number(row.ms);
}

export async function listNotifications(userId: string, limit = 50) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadCount(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}
