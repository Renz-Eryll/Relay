import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { assignAgent, claimTicket, replyToTicket, setPriority, setStatus } from "@/app/actions/tickets";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Avatar, PriorityTag, StatusBadge } from "@/components/ui";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getTicket, listAgents } from "@/lib/data";
import { dateTimeLabel, timeAgo } from "@/lib/format";
import { PRIORITIES, PRIORITY, STATUS, ticketRef } from "@/lib/labels";
import { allowedStatuses, canClaim, canReply, canWork } from "@/lib/permissions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Ticket ${ticketRef(Number((await params).id))}` };
}

type EventLike = { fromValue: string | null; toValue: string | null };
const EVENT_TEXT: Record<"created" | "status" | "priority" | "assigned" | "unassigned", (e: EventLike) => string> = {
  created: () => "opened the ticket",
  status: (e) =>
    `changed status to ${STATUS[e.toValue as keyof typeof STATUS]?.label.toLowerCase() ?? e.toValue}`,
  priority: (e) =>
    `set priority to ${PRIORITY[e.toValue as keyof typeof PRIORITY]?.label.toLowerCase() ?? e.toValue}`,
  assigned: (e) => `assigned the ticket to ${e.toValue}`,
  unassigned: () => "unassigned the ticket",
};

const ROLE_TAG = { customer: null, agent: "Agent", admin: "Admin" } as const;

export default async function TicketPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const id = Number((await params).id);
  const { created } = await searchParams;
  const { ticket, category, customer, agent, thread, events } = await getTicket(user, id);

  // Opening a ticket reads its notifications.
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, user.id), eq(notifications.ticketId, id), isNull(notifications.readAt)));

  const statuses = allowedStatuses(user, ticket);
  const working = canWork(user, ticket);
  const agents = user.role === "admin" ? (await listAgents()).sort((a, b) => Number(b.categoryId === ticket.categoryId) - Number(a.categoryId === ticket.categoryId) || a.name.localeCompare(b.name)) : [];

  // One timeline: replies and audit events in order. The "created" event is shown as the opening message.
  const timeline = [
    ...thread.map((m) => ({ kind: "message" as const, at: m.createdAt, m })),
    ...events.filter((e) => e.type !== "created").map((e) => ({ kind: "event" as const, at: e.createdAt, e })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const statusLabel = (s: (typeof statuses)[number]) =>
    user.role === "customer" ? (s === "open" ? "Reopen ticket" : "Close ticket") : STATUS[s].label;

  return (
    <>
      {created && (
        <p className="mb-5 rounded-[6px] border border-ok/25 bg-ok-soft px-4 py-3 text-[13px] text-ok">
          Ticket {ticketRef(id)} created. We’ve notified the {category.name} team and you’ll get a notification when someone replies.
        </p>
      )}

      <div className="mb-6">
        <p className="num text-[13px] text-faint">
          {ticketRef(id)} · {category.name}
        </p>
        <h1 className="mt-1 text-[24px] leading-tight font-semibold tracking-tight">{ticket.subject}</h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <StatusBadge status={ticket.status} />
          <PriorityTag priority={ticket.priority} />
          <span className="text-[13px] text-muted">Updated {timeAgo(ticket.updatedAt)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          <ol className="space-y-4">
            <li className="card p-5">
              <div className="flex items-center gap-3">
                <Avatar name={customer.name} />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{customer.name}</p>
                  <p className="text-xs text-faint">{dateTimeLabel(ticket.createdAt)}</p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap">{ticket.description}</p>
            </li>

            {timeline.map((item) =>
              item.kind === "message" ? (
                <li key={`m${item.m.id}`} className={`card p-5 ${item.m.authorRole !== "customer" ? "border-l-2 border-l-brand" : ""}`}>
                  <div className="flex items-center gap-3">
                    <Avatar name={item.m.authorName} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[13px] font-medium">
                        {item.m.authorName}
                        {ROLE_TAG[item.m.authorRole] && <span className="rounded-[4px] bg-brand-soft px-1.5 text-[10px] font-medium text-brand-ink">{ROLE_TAG[item.m.authorRole]}</span>}
                      </p>
                      <p className="text-xs text-faint">{dateTimeLabel(item.m.createdAt)}</p>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap">{item.m.body}</p>
                </li>
              ) : (
                <li key={`e${item.e.id}`} className="flex items-center gap-2 px-2 text-[12px] text-muted">
                  <span className="size-1.5 rounded-full bg-line-strong" aria-hidden />
                  <span>
                    <span className="font-medium text-ink">{item.e.actorName ?? "Someone"}</span> {item.e.type === "assigned" && item.e.toValue === item.e.actorName ? "claimed the ticket" : EVENT_TEXT[item.e.type](item.e)}
                  </span>
                  <span className="text-faint">· {timeAgo(item.e.createdAt)}</span>
                </li>
              ),
            )}
          </ol>

          {canReply(user, ticket) ? (
            <ActionForm action={replyToTicket.bind(null, id)} className="card mt-5 space-y-3 p-4">
              <label htmlFor="body" className="sr-only">
                Reply
              </label>
              <textarea
                id="body"
                name="body"
                rows={4}
                required
                maxLength={5000}
                placeholder={user.role === "customer" ? "Add more details or reply to the agent…" : `Reply to ${customer.name}…`}
                className="field h-auto resize-y py-2.5"
              />
              <div className="flex justify-end">
                <SubmitButton pending="Sending…">Send reply</SubmitButton>
              </div>
            </ActionForm>
          ) : (
            <p className="mt-5 rounded-[6px] border border-dashed border-line-strong px-4 py-3 text-[13px] text-muted">
              {ticket.status === "closed" ? "This ticket is closed. Reopen it to continue the conversation." : "You can view this ticket but can’t reply."}
            </p>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="card divide-y divide-line">
            <dl className="space-y-3 p-4 text-[13px]">
              <div>
                <dt className="eyebrow">Customer</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Avatar name={customer.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{customer.name}</span>
                    {user.role !== "customer" && <span className="block truncate text-xs text-muted">{customer.company ?? customer.email}</span>}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Assigned to</dt>
                <dd className="mt-1">
                  {agent?.id ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={agent.name} size="sm" />
                      <span className="font-medium">{agent.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted">Waiting for an agent</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Opened</dt>
                <dd>{dateTimeLabel(ticket.createdAt)}</dd>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Resolved</dt>
                  <dd>{dateTimeLabel(ticket.resolvedAt)}</dd>
                </div>
              )}
            </dl>

            {canClaim(user, ticket) && (
              <div className="p-4">
                <ConfirmButton action={claimTicket.bind(null, id)} className="btn-primary w-full">
                  Claim this ticket
                </ConfirmButton>
              </div>
            )}

            {statuses.length > 0 && (
              <div className="p-4">
                {user.role === "customer" ? (
                  <ActionForm action={setStatus.bind(null, id)} className="space-y-2">
                    <input type="hidden" name="status" value={statuses[0]} />
                    <SubmitButton className="btn-outline w-full" pending="Saving…">
                      {statusLabel(statuses[0])}
                    </SubmitButton>
                  </ActionForm>
                ) : (
                  <ActionForm action={setStatus.bind(null, id)} className="space-y-2">
                    <label className="label" htmlFor="status">
                      Status
                    </label>
                    <div className="flex gap-2">
                      <select id="status" name="status" className="field h-9 text-[13px]" defaultValue={statuses.includes("resolved") ? "resolved" : statuses[0]}>
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel(s)}
                          </option>
                        ))}
                      </select>
                      <SubmitButton className="btn-dark h-9" pending="…">
                        Update
                      </SubmitButton>
                    </div>
                  </ActionForm>
                )}
              </div>
            )}

            {working && (
              <div className="p-4">
                <ActionForm action={setPriority.bind(null, id)} className="space-y-2">
                  <label className="label" htmlFor="priority">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    <select id="priority" name="priority" defaultValue={ticket.priority} className="field h-9 text-[13px]">
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY[p].label}
                        </option>
                      ))}
                    </select>
                    <SubmitButton className="btn-dark h-9" pending="…">
                      Set
                    </SubmitButton>
                  </div>
                </ActionForm>
              </div>
            )}

            {user.role === "admin" && (
              <div className="p-4">
                <ActionForm action={assignAgent.bind(null, id)} className="space-y-2">
                  <label className="label" htmlFor="agentId">
                    Assign agent
                  </label>
                  <div className="flex gap-2">
                    <select id="agentId" name="agentId" defaultValue={ticket.agentId ?? ""} className="field h-9 text-[13px]">
                      <option value="">Unassigned</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} · {a.category ?? "No category"} ({a.active} active)
                        </option>
                      ))}
                    </select>
                    <SubmitButton className="btn-dark h-9" pending="…">
                      Save
                    </SubmitButton>
                  </div>
                  <p className="text-xs text-faint">{category.name} agents are listed first.</p>
                </ActionForm>
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
