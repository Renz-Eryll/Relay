import type { Status } from "@/db/schema";

// Who can do what with a ticket. Kept pure so pages and actions share the same rules.
type Actor = { id: string; role: "customer" | "agent" | "admin"; categoryId: number | null };
type TicketRef = { customerId: string; agentId: string | null; categoryId: number; status: Status };

export const canView = (u: Actor, t: TicketRef) =>
  u.role === "admin" ||
  (u.role === "customer" && t.customerId === u.id) ||
  (u.role === "agent" && (t.agentId === u.id || (t.agentId === null && t.categoryId === u.categoryId)));

// Closed tickets are read-only until reopened.
export const canReply = (u: Actor, t: TicketRef) => canView(u, t) && t.status !== "closed";

// Staff working the ticket: admins, or the assigned agent.
export const canWork = (u: Actor, t: TicketRef) => u.role === "admin" || (u.role === "agent" && t.agentId === u.id);

// An agent can pick up an unassigned ticket in their category.
export const canClaim = (u: Actor, t: TicketRef) => u.role === "agent" && t.agentId === null && t.categoryId === u.categoryId;

// Status changes each role may make from a given status.
export function allowedStatuses(u: Actor, t: TicketRef): Status[] {
  if (canWork(u, t)) return (["open", "in_progress", "resolved", "closed"] as Status[]).filter((s) => s !== t.status);
  if (u.role === "customer" && t.customerId === u.id) {
    if (t.status === "resolved" || t.status === "closed") return ["open"]; // reopen
    return ["closed"]; // close it themselves
  }
  return [];
}
