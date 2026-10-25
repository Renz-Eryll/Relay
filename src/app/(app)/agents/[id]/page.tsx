import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { removeAgent, updateAgent } from "@/app/actions/people";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Avatar, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listAgents, listCategories } from "@/lib/data";

export const metadata: Metadata = { title: "Edit agent" };

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const [agents, cats] = await Promise.all([listAgents(), listCategories()]);
  const agent = agents.find((a) => a.id === id);
  if (!agent) notFound();

  return (
    <div className="max-w-xl">
      <PageHeader back={{ href: "/agents", label: "Agents" }} title={agent.name} description={`${agent.active} active, ${agent.resolved} resolved`} />

      <section className="card p-5">
        <div className="mb-5 flex items-center gap-3">
          <Avatar name={agent.name} />
          <p className="text-[13px] text-muted">{agent.email}</p>
        </div>
        <ActionForm action={updateAgent.bind(null, agent.id)} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" defaultValue={agent.name} required minLength={2} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" defaultValue={agent.email} required readOnly={agent.isDemo} className="field read-only:bg-sunken" />
            {agent.isDemo && <p className="mt-1.5 text-xs text-faint">Demo agents keep their email so everyone can sign in.</p>}
          </div>
          <div>
            <label className="label" htmlFor="categoryId">
              Category
            </label>
            <select id="categoryId" name="categoryId" defaultValue={agent.categoryId ?? ""} className="field">
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton>Save changes</SubmitButton>
        </ActionForm>
      </section>

      {!agent.isDemo && (
        <section className="card mt-6 p-5">
          <h2 className="text-[15px] font-semibold text-danger">Remove agent</h2>
          <p className="mt-1 mb-4 text-[13px] text-muted">They’ll lose access. Their open tickets go back to the unassigned queue.</p>
          <ConfirmButton action={removeAgent.bind(null, agent.id)} confirm={`Remove ${agent.name}?`} className="btn-danger">
            Remove {agent.name.split(" ")[0]}
          </ConfirmButton>
        </section>
      )}
    </div>
  );
}
