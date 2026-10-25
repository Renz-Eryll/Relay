import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { categoryBreakdown, listAgents } from "@/lib/data";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireUser("admin");
  const [cats, agents] = await Promise.all([categoryBreakdown(), listAgents()]);

  return (
    <>
      <PageHeader title="Categories" description="The product areas customers raise tickets about. Each agent handles one category." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cats.map((c) => {
          const team = agents.filter((a) => a.categoryId === c.id);
          return (
            <section key={c.id} className="card flex flex-col">
              <div className="border-b border-line p-5">
                <h2 className="text-[15px] font-semibold">{c.name}</h2>
                <p className="mt-1 text-[13px] text-muted">{c.description}</p>
              </div>
              <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
                {[
                  { label: "Active", value: c.open, href: `/tickets?status=active&category=${c.slug}` },
                  { label: "Unassigned", value: c.unassigned, href: `/tickets?status=active&category=${c.slug}` },
                  { label: "All time", value: c.total, href: `/tickets?category=${c.slug}` },
                ].map((s) => (
                  <Link key={s.label} href={s.href} className="px-4 py-3 hover:bg-sunken/50">
                    <dt className="eyebrow">{s.label}</dt>
                    <dd className={`num mt-1 text-[20px] leading-none font-medium ${s.label === "Unassigned" && s.value > 0 ? "text-amber" : ""}`}>{s.value}</dd>
                  </Link>
                ))}
              </dl>
              <p className="mt-auto px-5 py-3 text-[13px] text-muted">
                {team.length ? `Team: ${team.map((a) => a.name).join(", ")}` : <span className="text-amber">No agents in this category yet</span>}
              </p>
            </section>
          );
        })}
      </div>
    </>
  );
}
