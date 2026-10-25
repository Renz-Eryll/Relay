import type { Metadata } from "next";
import { createTicket } from "@/app/actions/tickets";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listCategories } from "@/lib/data";
import { PRIORITIES, PRIORITY } from "@/lib/labels";

export const metadata: Metadata = { title: "New ticket" };

const PRIORITY_HINT = { low: "Question or small request", medium: "Something isn’t working right", high: "Blocking part of our work", urgent: "We can’t operate" } as const;

export default async function NewTicketPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  await requireUser("customer");
  const [cats, { welcome }] = await Promise.all([listCategories(), searchParams]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={welcome ? "Welcome to Relay" : "New ticket"}
        description={welcome ? "Your account is ready. Tell us what you need help with and the right team will pick it up." : "Tell us what’s going on. The team for that area is notified right away."}
      />

      <ActionForm action={createTicket} className="space-y-6">
        <fieldset>
          <legend className="label">What is it about?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {cats.map((c, i) => (
              <label
                key={c.id}
                className="card flex cursor-pointer gap-3 p-3.5 transition-colors hover:border-line-strong has-checked:border-brand has-checked:bg-brand-soft/40 has-focus-visible:outline-2 has-focus-visible:outline-brand"
              >
                <input type="radio" name="categoryId" value={c.id} defaultChecked={i === 0} className="mt-1 accent-[var(--color-brand)]" required />
                <span>
                  <span className="block text-[14px] font-medium">{c.name}</span>
                  <span className="block text-[12px] text-muted">{c.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="subject">
            Subject
          </label>
          <input id="subject" name="subject" required minLength={5} maxLength={140} placeholder="e.g. Receipt printer goes offline after a few sales" className="field" />
        </div>

        <div>
          <label className="label" htmlFor="description">
            Details
          </label>
          <textarea
            id="description"
            name="description"
            required
            minLength={20}
            maxLength={5000}
            rows={7}
            placeholder="What happened, when it started, and what you’ve already tried."
            className="field h-auto resize-y py-2.5"
          />
        </div>

        <fieldset>
          <legend className="label">How urgent is it?</legend>
          <div className="grid gap-2 sm:grid-cols-4">
            {PRIORITIES.map((p) => (
              <label key={p} className="card cursor-pointer p-3 transition-colors hover:border-line-strong has-checked:border-brand has-checked:bg-brand-soft/40">
                <input type="radio" name="priority" value={p} defaultChecked={p === "medium"} className="sr-only" />
                <span className="block text-[13px] font-medium">{PRIORITY[p].label}</span>
                <span className="block text-[12px] text-muted">{PRIORITY_HINT[p]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end">
          <SubmitButton pending="Submitting…">Submit ticket</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
