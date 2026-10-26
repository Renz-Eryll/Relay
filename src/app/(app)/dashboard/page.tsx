import type { Metadata } from "next";
import Link from "next/link";
import TicketTable from "@/components/TicketTable";
import { Avatar, PageHeader, SectionTitle, StatStrip, EmptyNote } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { avgResolutionMs, categoryBreakdown, listAgents, listTickets, statusCounts } from "@/lib/data";
import { duration } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser("admin");
  const [counts, avg, cats, agents, unassigned] = await Promise.all([
    statusCounts(user),
    avgResolutionMs(user),
    categoryBreakdown(),
    listAgents(),
    listTickets(user, { status: "active", scope: "unassigned" }).then((r) => r.rows.slice(0, 6)),
  ]);
  const unassignedTotal = cats.reduce((n, c) => n + c.unassigned, 0);
  const maxOpen = Math.max(1, ...cats.map((c) => c.open));

  return (
    <>
      <PageHeader title={`Good day, ${user.name.split(" ")[0]}`} description="Here’s what needs attention across the support desk." />

      <StatStrip
        items={[
          { label: "Open", value: counts.open, hint: "Waiting for a first response", href: "/tickets?status=open" },
          { label: "In progress", value: counts.in_progress, hint: "Being worked on", href: "/tickets?status=in_progress" },
          { label: "Unassigned", value: unassignedTotal, hint: "Need an agent", href: "/tickets?status=active" },
          { label: "Avg. time to resolve", value: avg ? duration(avg) : "—", hint: "Last 30 days" },
        ]}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="min-w-0">
          <SectionTitle aside={<Link href="/tickets?status=active" className="text-[13px] font-medium text-brand-ink hover:underline">View all</Link>}>
            Waiting for an agent
          </SectionTitle>
          {unassigned.length ? (
            <TicketTable rows={unassigned} show={["customer"]} />
          ) : (
            <EmptyNote>Every active ticket has an agent.</EmptyNote>
          )}
        </section>

        <section>
          <SectionTitle aside={<Link href="/categories" className="text-[13px] font-medium text-brand-ink hover:underline">Details</Link>}>
            Active by category
          </SectionTitle>
          <ul className="card divide-y divide-line">
            {cats.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <Link href={`/tickets?status=active&category=${c.slug}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  <span className="num">{c.open}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-sunken dark:bg-line" aria-hidden>
                  <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(c.open / maxOpen) * 100}%` }} />
                </div>
                {c.unassigned > 0 && <p className="num mt-1.5 text-[11px] text-amber">{c.unassigned} unassigned</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <SectionTitle aside={<Link href="/agents" className="text-[13px] font-medium text-brand-ink hover:underline">Manage agents</Link>}>
          Agent workload
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <div key={a.id} className="card flex items-center gap-3 p-4">
              <Avatar name={a.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{a.name}</p>
                <p className="truncate text-xs text-muted">{a.category ?? "No category"}</p>
              </div>
              <div className="text-right">
                <p className="num text-[18px] leading-none font-medium">{a.active}</p>
                <p className="text-[11px] text-faint">active</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
