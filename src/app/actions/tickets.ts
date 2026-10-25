"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { categories, messages, ticketEvents, tickets, users, type Priority, type Status } from "@/db/schema";
import { ActionError, actor, runAction, type ActionState } from "@/lib/auth";
import { PRIORITIES, PRIORITY, STATUS, STATUSES } from "@/lib/labels";
import { notifyUsers, staffFor, titled, adminIds } from "@/lib/notify";
import { allowedStatuses, canClaim, canReply, canView, canWork } from "@/lib/permissions";

async function loadTicket(id: number) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
  if (!ticket) throw new ActionError("Ticket not found");
  return ticket;
}

const touch = (id: number) => {
  revalidatePath(`/tickets/${id}`);
  revalidatePath("/", "layout");
};

export async function createTicket(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor("customer");
    const parsed = z
      .object({
        subject: z.string().trim().min(5, "Add a short subject (at least 5 characters)").max(140),
        description: z.string().trim().min(20, "Describe the issue in a bit more detail").max(5000),
        categoryId: z.coerce.number().int().positive("Choose a category"),
        priority: z.enum(PRIORITIES as [Priority, ...Priority[]]),
      })
      .safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const [category] = await db.select().from(categories).where(eq(categories.id, parsed.data.categoryId));
    if (!category) return { error: "Choose a category" };

    const [ticket] = await db.insert(tickets).values({ ...parsed.data, customerId: user.id }).returning();
    await db.insert(ticketEvents).values({ ticketId: ticket.id, actorId: user.id, type: "created" });
    await notifyUsers(await staffFor(category.id), {
      ticketId: ticket.id,
      title: `New ${category.name} ticket`,
      body: `${user.name}: ${titled(ticket.id, ticket.subject)}`,
    });
    revalidatePath("/", "layout");
    redirect(`/tickets/${ticket.id}?created=1`);
  });
}

export async function replyToTicket(ticketId: number, _: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor();
    const parsed = z.string().trim().min(1, "Write a reply first").max(5000).safeParse(form.get("body"));
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const ticket = await loadTicket(ticketId);
    if (!canReply(user, ticket)) throw new ActionError(ticket.status === "closed" ? "Reopen the ticket to reply." : "You can’t reply to this ticket.");

    await db.insert(messages).values({ ticketId, authorId: user.id, body: parsed.data });
    // A staff reply on an open ticket moves it into progress.
    const autoProgress = user.role !== "customer" && ticket.status === "open";
    await db
      .update(tickets)
      .set({ updatedAt: new Date(), ...(autoProgress ? { status: "in_progress" as Status } : {}) })
      .where(eq(tickets.id, ticketId));
    if (autoProgress) await db.insert(ticketEvents).values({ ticketId, actorId: user.id, type: "status", fromValue: "open", toValue: "in_progress" });

    const recipients =
      user.role === "customer" ? (ticket.agentId ? [ticket.agentId] : await adminIds()) : [ticket.customerId, ticket.agentId];
    await notifyUsers(recipients, { ticketId, title: `New reply from ${user.name}`, body: titled(ticketId, ticket.subject) }, user.id);
    touch(ticketId);
    return { ok: "Reply sent" };
  });
}

export async function setStatus(ticketId: number, _: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor();
    const status = form.get("status") as Status;
    if (!STATUSES.includes(status)) throw new ActionError("Choose a status");

    const ticket = await loadTicket(ticketId);
    if (!canView(user, ticket) || !allowedStatuses(user, ticket).includes(status)) throw new ActionError("You can’t make that change.");

    await db
      .update(tickets)
      .set({
        status,
        updatedAt: new Date(),
        resolvedAt: status === "resolved" ? new Date() : status === "open" ? null : ticket.resolvedAt,
      })
      .where(eq(tickets.id, ticketId));
    await db.insert(ticketEvents).values({ ticketId, actorId: user.id, type: "status", fromValue: ticket.status, toValue: status });
    await notifyUsers([ticket.customerId, ticket.agentId], { ticketId, title: `Ticket ${STATUS[status].label.toLowerCase()}`, body: titled(ticketId, ticket.subject) }, user.id);
    touch(ticketId);
    return { ok: `Marked as ${STATUS[status].label.toLowerCase()}` };
  });
}

export async function setPriority(ticketId: number, _: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor("agent", "admin");
    const priority = form.get("priority") as Priority;
    if (!PRIORITIES.includes(priority)) throw new ActionError("Choose a priority");

    const ticket = await loadTicket(ticketId);
    if (!canWork(user, ticket)) throw new ActionError("Only the assigned agent or an admin can change priority.");
    if (ticket.priority === priority) return;

    await db.update(tickets).set({ priority, updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    await db.insert(ticketEvents).values({ ticketId, actorId: user.id, type: "priority", fromValue: ticket.priority, toValue: priority });
    touch(ticketId);
    return { ok: `Priority set to ${PRIORITY[priority].label.toLowerCase()}` };
  });
}

export async function assignAgent(ticketId: number, _: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor("admin");
    const agentId = String(form.get("agentId") ?? "");
    const ticket = await loadTicket(ticketId);

    if (!agentId) {
      if (!ticket.agentId) return;
      await db.update(tickets).set({ agentId: null, updatedAt: new Date() }).where(eq(tickets.id, ticketId));
      await db.insert(ticketEvents).values({ ticketId, actorId: user.id, type: "unassigned" });
      touch(ticketId);
      return { ok: "Unassigned" };
    }

    const [agent] = await db.select().from(users).where(and(eq(users.id, agentId), eq(users.role, "agent")));
    if (!agent) throw new ActionError("Choose an agent");
    if (ticket.agentId === agent.id) return;

    await db.update(tickets).set({ agentId: agent.id, updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    await db.insert(ticketEvents).values({ ticketId, actorId: user.id, type: "assigned", toValue: agent.name });
    await notifyUsers([agent.id], { ticketId, title: "Ticket assigned to you", body: titled(ticketId, ticket.subject) });
    await notifyUsers([ticket.customerId], { ticketId, title: `${agent.name} is on your ticket`, body: titled(ticketId, ticket.subject) });
    touch(ticketId);
    return { ok: `Assigned to ${agent.name}` };
  });
}

export async function claimTicket(ticketId: number, _: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor("agent");
    const ticket = await loadTicket(ticketId);
    if (!canClaim(user, ticket)) throw new ActionError("This ticket isn’t available to claim.");

    // Only claim if still unassigned, so two agents can't both take it.
    const claimed = await db
      .update(tickets)
      .set({ agentId: user.id, status: ticket.status === "open" ? "in_progress" : ticket.status, updatedAt: new Date() })
      .where(and(eq(tickets.id, ticketId), isNull(tickets.agentId)))
      .returning({ id: tickets.id });
    if (!claimed.length) throw new ActionError("Someone just took this ticket.");

    await db.insert(ticketEvents).values([
      { ticketId, actorId: user.id, type: "assigned", toValue: user.name },
      ...(ticket.status === "open" ? [{ ticketId, actorId: user.id, type: "status" as const, fromValue: "open", toValue: "in_progress" }] : []),
    ]);
    await notifyUsers([ticket.customerId], { ticketId, title: `${user.name} is on your ticket`, body: titled(ticketId, ticket.subject) });
    touch(ticketId);
    return { ok: "You’ve claimed this ticket" };
  });
}
