import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { assignAgent, claimTicket, replyToTicket, setCategory, setPriority, setStatus } from "@/app/actions/tickets";
import { TriageCard } from "@/components/ai";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Avatar, PriorityTag, RelayTrack, StatusBadge } from "@/components/ui";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { latestTriage } from "@/lib/ai/run-triage";
import { getTicket, listAgents, listCategories } from "@/lib/data";
import { dateTimeLabel, timeAgo } from "@/lib/format";
import { PRIORITIES, PRIORITY, STATUS, ticketRef } from "@/lib/labels";
import { allowedStatuses, canClaim, canReply, canWork } from "@/lib/permissions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Ticket ${ticketRef(Number((await params).id))}` };
}

type EventLike = { fromValue: string | null; toValue: string | null };
const EVENT_TEXT: Record<"created" | "status" | "priority" | "assigned" | "unassigned" | "category", (e: EventLike) => string> = {
  created: () => "opened the ticket",
  status: (e) =>
    `changed status to ${STATUS[e.toValue as keyof typeof STATUS]?.label.toLowerCase() ?? e.toValue}`,
  priority: (e) =>
    `set priority to ${PRIORITY[e.toValue as keyof typeof PRIORITY]?.label.toLowerCase() ?? e.toValue}`,
  assigned: (e) => `assigned the ticket to ${e.toValue}`,
  unassigned: () => "unassigned the ticket",
  category: (e) => `moved the ticket from ${e.fromValue} to ${e.toValue}`,
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
  const staff = user.role !== "customer";
  const [triage, cats] = staff ? await Promise.all([latestTriage(id), listCategories()]) : [null, []];
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

      {/* Ticket stub: the ref on a perforated tear-off, the relay track beside it. */}
      <header className="card relative mb-8 overflow-hidden sm:flex">
        <div className="perf flex items-center justify-between gap-3 border-b bg-sunken/50 px-5 py-4 sm:w-44 sm:shrink-0 sm:flex-col sm:items-start sm:border-r sm:border-b-0">
          <p className="eyebrow">Ticket</p>
          <p className="num text-[26px] leading-none font-medium tracking-tight text-brand-ink">{ticketRef(id)}</p>
          <p className="truncate text-xs text-muted">{category.name}</p>
        </div>
        <span className="absolute -top-2 left-[calc(11rem-8px)] hidden size-4 rounded-full border border-line bg-paper sm:block" aria-hidden />
        <span className="absolute -bottom-2 left-[calc(11rem-8px)] hidden size-4 rounded-full border border-line bg-paper sm:block" aria-hidden />
        <div className="min-w-0 flex-1 px-5 py-4 sm:px-6">
          <h1 className="display text-[22px] leading-tight sm:text-[24px]">{ticket.subject}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <StatusBadge status={ticket.status} />
            <PriorityTag priority={ticket.priority} />
            <span className="text-[13px] text-muted">Updated {timeAgo(ticket.updatedAt)}</span>
          </div>
          <RelayTrack status={ticket.status} className="mt-5 max-w-xl" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          {/* The thread: one line joins the opening message, every reply and every handoff. */}
          <ol className="relative space-y-4 before:absolute before:top-4 before:bottom-4 before:left-[15px] before:w-px before:bg-line-strong">
            <li className="relative flex gap-4">
              <span className="relative z-10 rounded-full ring-4 ring-paper">
                <Avatar name={customer.name} />
              </span>
              <div className="card min-w-0 flex-1 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-[13px] font-medium">
                    {customer.name} <span className="font-normal text-muted">opened the ticket</span>
                  </p>
                  <p className="num text-[11px] text-faint">{dateTimeLabel(ticket.createdAt)}</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </li>

            {timeline.map((item) =>
              item.kind === "message" ? (
                <li key={`m${item.m.id}`} className="relative flex gap-4">
                  <span className="relative z-10 rounded-full ring-4 ring-paper">
                    <Avatar name={item.m.authorName} />
                  </span>
                  <div className={`card min-w-0 flex-1 p-5 ${item.m.authorRole !== "customer" ? "border-l-2 border-l-brand" : ""}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="flex items-center gap-2 text-[13px] font-medium">
                        {item.m.authorName}
                        {ROLE_TAG[item.m.authorRole] && <span className="num rounded-[4px] bg-brand-soft px-1.5 text-[10px] font-medium tracking-wide text-brand-ink uppercase">{ROLE_TAG[item.m.authorRole]}</span>}
                      </p>
                      <p className="num text-[11px] text-faint">{dateTimeLabel(item.m.createdAt)}</p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap">{item.m.body}</p>
                  </div>
                </li>
              ) : (
                <li key={`e${item.e.id}`} className="relative flex items-center gap-4 text-[12px] text-muted">
                  {/* Handoff node on the thread. */}
                  <span className="relative z-10 grid size-8 shrink-0 place-items-center" aria-hidden>
                    <span className={`size-2.5 rotate-45 border border-brand ${item.e.byAi ? "bg-brand" : "bg-paper"}`} />
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{item.e.byAi ? "Relay AI" : (item.e.actorName ?? "Someone")}</span> {item.e.type === "assigned" && item.e.toValue === item.e.actorName ? "claimed the ticket" : EVENT_TEXT[item.e.type](item.e)}
                    <span className="num text-faint"> · {timeAgo(item.e.createdAt)}</span>
                  </span>
                </li>
              ),
            )}
          </ol>

          {canReply(user, ticket) ? (
            <ActionForm action={replyToTicket.bind(null, id)} className="card mt-5 space-y-3 p-4 sm:ml-12">
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
            <p className="perf mt-5 rounded-[6px] border px-4 py-3 text-[13px] text-muted sm:ml-12">
              {ticket.status === "closed" ? "This ticket is closed. Reopen it to continue the conversation." : "You can view this ticket but can’t reply."}
            </p>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {triage && (
            <TriageCard
              ticketId={id}
              isAdmin={user.role === "admin"}
              triage={{ ...triage, category: cats.find((c) => c.id === triage.categoryId)?.name ?? null }}
            />
          )}
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

            {user.role === "admin" && (
              <div className="p-4">
                <ActionForm action={setCategory.bind(null, id)} className="space-y-2">
                  <label className="label" htmlFor="categoryId">
                    Category
                  </label>
                  <div className="flex gap-2">
                    <select id="categoryId" name="categoryId" defaultValue={ticket.categoryId} className="field h-9 text-[13px]">
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <SubmitButton className="btn-dark h-9" pending="…">
                      Move
                    </SubmitButton>
                  </div>
                </ActionForm>
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
