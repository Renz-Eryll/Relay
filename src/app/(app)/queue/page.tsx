import type { Metadata } from "next";
import Link from "next/link";
import TicketTable from "@/components/TicketTable";
import { PageHeader, SectionTitle, StatStrip, EmptyNote } from "@/components/ui";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { avgResolutionMs, listTickets, statusCounts } from "@/lib/data";
import { duration } from "@/lib/format";

export const metadata: Metadata = { title: "My queue" };

export default async function QueuePage() {
  const user = await requireUser("agent");
  const [mine, unassigned, counts, avg, [category]] = await Promise.all([
    listTickets(user, { status: "active", scope: "mine" }),
    listTickets(user, { status: "active", scope: "unassigned" }),
    statusCounts(user, { mine: true }),
    avgResolutionMs(user, { mine: true }),
    user.categoryId ? db.select().from(categories).where(eq(categories.id, user.categoryId)) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title="My queue" description={category ? `You handle ${category.name} tickets.` : "You haven’t been assigned a category yet. Ask an admin to set one."} />

      <StatStrip
        items={[
          { label: "Assigned to me", value: counts.open + counts.in_progress, hint: "Open or in progress", href: "/tickets?scope=mine&status=active" },
          { label: "Unassigned", value: unassigned.total, hint: category ? `In ${category.name}` : "In your category", href: "/tickets?scope=unassigned&status=active" },
          { label: "Resolved", value: counts.resolved + counts.closed, hint: "All time", href: "/tickets?scope=mine&status=resolved" },
          { label: "Avg. time to resolve", value: avg ? duration(avg) : "—", hint: "Last 30 days" },
        ]}
      />

      <section className="mt-8">
        <SectionTitle>Assigned to you</SectionTitle>
        {mine.rows.length ? (
          <TicketTable rows={mine.rows} show={["customer"]} />
        ) : (
          <EmptyNote>Nothing assigned right now. Claim a ticket below.</EmptyNote>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle aside={<Link href="/tickets?scope=unassigned&status=active" className="text-[13px] font-medium text-brand-ink hover:underline">View all</Link>}>
          Up for grabs
        </SectionTitle>
        {unassigned.rows.length ? (
          <TicketTable rows={unassigned.rows.slice(0, 8)} show={["customer"]} />
        ) : (
          <EmptyNote>No unassigned tickets in your category.</EmptyNote>
        )}
      </section>
    </>
  );
}
