import Link from "next/link";
import type { Priority, Status } from "@/db/schema";
import { timeAgo } from "@/lib/format";
import { ticketRef } from "@/lib/labels";
import { Avatar, PriorityTag, StatusBadge } from "./ui";

export type TicketRow = {
  id: number;
  subject: string;
  status: Status;
  priority: Priority;
  updatedAt: Date;
  category: string;
  customerName: string;
  agentName: string | null;
};

type Column = "customer" | "agent";

export default function TicketTable({ rows, show = ["customer", "agent"] }: { rows: TicketRow[]; show?: Column[] }) {
  return (
    <>
      {/* Phones: stacked cards */}
      <ul className="card divide-y divide-line md:hidden">
        {rows.map((t) => (
          <li key={t.id}>
            <Link href={`/tickets/${t.id}`} className="block px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="num text-[12px] text-faint">
                  <span className="text-brand-ink">{ticketRef(t.id)}</span> · {t.category}
                </span>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-1 font-medium">{t.subject}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                <PriorityTag priority={t.priority} />
                {show.includes("customer") && <span>{t.customerName}</span>}
                {show.includes("agent") && <span>{t.agentName ?? "Unassigned"}</span>}
                <span className="text-faint">{timeAgo(t.updatedAt)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="card hidden overflow-hidden md:block">
      <table className="w-full table-fixed text-left">
        <thead>
          <tr className="border-b border-line [&>th]:eyebrow [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-medium">
            <th className="perf w-[92px] border-r">Ticket</th>
            <th>Subject</th>
            {show.includes("customer") && <th className="w-[160px]">Customer</th>}
            {show.includes("agent") && <th className="w-[170px]">Agent</th>}
            <th className="w-[104px]">Priority</th>
            <th className="w-[110px]">Status</th>
            <th className="w-[96px]">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((t) => (
            <tr key={t.id} className="group relative transition-colors hover:bg-sunken/60">
              {/* Ref as a ticket stub: perforated edge, teal on hover. */}
              <td className="num perf border-r px-4 py-3 text-[13px] text-faint group-hover:text-brand-ink group-hover:shadow-[inset_2px_0_0_var(--color-brand)]">{ticketRef(t.id)}</td>
              <td className="px-4 py-3">
                {/* Stretched link: the whole row opens the ticket. */}
                <Link href={`/tickets/${t.id}`} className="block truncate font-medium after:absolute after:inset-0">
                  {t.subject}
                </Link>
                <p className="truncate text-xs text-faint">{t.category}</p>
              </td>
              {show.includes("customer") && <td className="truncate px-4 py-3 text-[13px]">{t.customerName}</td>}
              {show.includes("agent") && (
                <td className="truncate px-4 py-3 text-[13px]">
                  {t.agentName ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar name={t.agentName} size="sm" />
                      {t.agentName}
                    </span>
                  ) : (
                    <span className="text-faint">Unassigned</span>
                  )}
                </td>
              )}
              <td className="px-4 py-3 whitespace-nowrap">
                <PriorityTag priority={t.priority} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={t.status} />
              </td>
              <td className="num px-4 py-3 text-[12px] whitespace-nowrap text-muted">{timeAgo(t.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

export function Pagination({ page, pages, params }: { page: number; pages: number; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), page: String(p) } as Record<string, string>)}`;
  return (
    <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
      <span>
        Page <span className="num text-ink">{page}</span> of <span className="num">{pages}</span>
      </span>
      <div className="flex gap-2">
        {page > 1 ? <Link href={href(page - 1)} className="btn-outline">Previous</Link> : <span className="btn-outline opacity-40">Previous</span>}
        {page < pages ? <Link href={href(page + 1)} className="btn-outline">Next</Link> : <span className="btn-outline opacity-40">Next</span>}
      </div>
    </div>
  );
}
