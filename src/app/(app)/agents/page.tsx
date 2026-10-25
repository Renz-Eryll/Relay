import type { Metadata } from "next";
import Link from "next/link";
import { createAgent } from "@/app/actions/people";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listAgents, listCategories } from "@/lib/data";
import { dateLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Agents" };

export default async function AgentsPage() {
  await requireUser("admin");
  const [agents, cats] = await Promise.all([listAgents(), listCategories()]);

  return (
    <>
      <PageHeader title="Agents" description="Support agents handle tickets in their category. Removing an agent sends their open tickets back to the queue." />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card overflow-x-auto self-start">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line [&>th]:eyebrow [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-medium">
                <th>Agent</th>
                <th>Category</th>
                <th>Active</th>
                <th>Resolved</th>
                <th>Since</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {agents.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={a.name} />
                      <span className="min-w-0">
                        <span className="block font-medium">{a.name}</span>
                        <span className="block text-xs text-muted">{a.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{a.category ?? <span className="text-amber">None</span>}</td>
                  <td className="num px-4 py-3">{a.active}</td>
                  <td className="num px-4 py-3">{a.resolved}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{dateLabel(a.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/agents/${a.id}`} className="btn-ghost h-8 px-2.5">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="card self-start p-5">
          <h2 className="text-[15px] font-semibold">Add an agent</h2>
          <p className="mt-1 text-xs text-muted">Share the temporary password with them. They can change it in Settings.</p>
          <ActionForm action={createAgent} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input id="name" name="name" required minLength={2} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Work email
              </label>
              <input id="email" name="email" type="email" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="categoryId">
                Category
              </label>
              <select id="categoryId" name="categoryId" className="field">
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="password">
                Temporary password
              </label>
              <input id="password" name="password" type="text" required minLength={8} autoComplete="off" className="field num" />
            </div>
            <SubmitButton pending="Adding…">Add agent</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
