import type { Metadata } from "next";
import Link from "next/link";
import TicketTable, { Pagination } from "@/components/TicketTable";
import { EmptyState, PageHeader } from "@/components/ui";
import type { Priority, Status } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { listCategories, listTickets, type TicketFilters } from "@/lib/data";
import { PRIORITIES, PRIORITY, STATUS, STATUSES } from "@/lib/labels";

export const metadata: Metadata = { title: "Tickets" };

type Params = { status?: string; priority?: string; category?: string; q?: string; scope?: string; page?: string };

export default async function TicketsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const p = await searchParams;

  const filters: TicketFilters = {
    status: p.status === "active" || STATUSES.includes(p.status as Status) ? (p.status as TicketFilters["status"]) : undefined,
    priority: PRIORITIES.includes(p.priority as Priority) ? (p.priority as Priority) : undefined,
    category: p.category || undefined,
    q: p.q?.trim().slice(0, 100) || undefined,
    scope: user.role === "agent" && (p.scope === "mine" || p.scope === "unassigned") ? p.scope : undefined,
    page: Number(p.page) || 1,
  };
  const [{ rows, total, page, pages }, cats] = await Promise.all([listTickets(user, filters), listCategories()]);

  const title = user.role === "customer" ? "My tickets" : user.role === "agent" ? "Tickets" : "All tickets";
  const description =
    user.role === "customer"
      ? "Everything you’ve raised with support."
      : user.role === "agent"
        ? "Tickets assigned to you, plus unassigned tickets in your category."
        : "Every ticket across all categories.";

  const tabs: { label: string; status?: string }[] = [
    { label: "Active", status: "active" },
    { label: "All" },
    ...STATUSES.map((s) => ({ label: STATUS[s].label, status: s })),
  ];
  const tabHref = (status?: string) => `?${new URLSearchParams(Object.entries({ ...p, status, page: undefined }).filter(([, v]) => v) as [string, string][])}`;
  const currentTab = p.status ?? "";

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          user.role === "customer" && (
            <Link href="/tickets/new" className="btn-primary">
              New ticket
            </Link>
          )
        }
      />

      <div className="-mx-4 flex gap-5 overflow-x-auto border-b border-line px-4 whitespace-nowrap sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((t) => (
          <Link key={t.label} href={tabHref(t.status)} className={(t.status ?? "") === currentTab ? "tab-active" : "tab"}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* Plain GET form: filters live in the URL, so views can be bookmarked and shared. */}
      <form className="mt-4 flex flex-wrap items-center gap-2">
        {p.status && <input type="hidden" name="status" value={p.status} />}
        <input name="q" defaultValue={p.q} placeholder="Search subject, customer or #number" className="field h-9 w-full text-[13px] sm:w-64" />
        {user.role !== "customer" && (
          <select name="category" defaultValue={p.category ?? ""} className="field h-9 min-w-0 flex-1 text-[13px] sm:w-44 sm:flex-none" aria-label="Category">
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <select name="priority" defaultValue={p.priority ?? ""} className="field h-9 min-w-0 flex-1 text-[13px] sm:w-36 sm:flex-none" aria-label="Priority">
          <option value="">Any priority</option>
          {PRIORITIES.map((pr) => (
            <option key={pr} value={pr}>
              {PRIORITY[pr].label}
            </option>
          ))}
        </select>
        {user.role === "agent" && (
          <select name="scope" defaultValue={p.scope ?? ""} className="field h-9 min-w-0 flex-1 text-[13px] sm:w-40 sm:flex-none" aria-label="Assignment">
            <option value="">Mine + unassigned</option>
            <option value="mine">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        )}
        <button className="btn-dark h-9">Apply</button>
        {(p.q || p.category || p.priority || p.scope) && (
          <Link href={tabHref(p.status)} className="btn-ghost h-9">
            Clear
          </Link>
        )}
        <span className="w-full text-[13px] text-muted sm:ml-auto sm:w-auto">
          <span className="num text-ink">{total}</span> {total === 1 ? "ticket" : "tickets"}
        </span>
      </form>

      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState
            title={p.q || p.category || p.priority ? "No tickets match these filters" : "No tickets here yet"}
            body={user.role === "customer" ? "When you raise a ticket, it shows up here with its status and replies." : undefined}
            action={
              user.role === "customer" && (
                <Link href="/tickets/new" className="btn-primary">
                  Raise a ticket
                </Link>
              )
            }
          />
        ) : (
          <TicketTable rows={rows} show={user.role === "customer" ? ["agent"] : ["customer", "agent"]} />
        )}
        <Pagination page={page} pages={pages} params={p} />
      </div>
    </>
  );
}
