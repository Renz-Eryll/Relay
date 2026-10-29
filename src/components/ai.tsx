import type { Priority, TriageOutcome } from "@/db/schema";
import { acceptTriage, dismissTriage } from "@/app/actions/ai";
import { ConfirmButton } from "./forms";
import { Icon } from "./Nav";
import { PriorityTag } from "./ui";

// The mark for anything Relay AI produced, so people can always tell AI output from a person's.
export function AiChip({ className = "" }: { className?: string }) {
  return (
    <span className={`eyebrow inline-flex items-center gap-1.5 text-brand-ink ${className}`}>
      <Icon name="ai" className="size-3.5" />
      Relay AI
    </span>
  );
}

export function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="flex items-center gap-2" title="How sure Relay AI is about the category">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line-strong/70" aria-hidden>
        <span className={`block h-full rounded-full ${value >= 0.9 ? "bg-brand" : value >= 0.7 ? "bg-amber" : "bg-danger"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="num text-[12px] text-muted">{pct}%</span>
    </span>
  );
}

export const OUTCOME: Record<TriageOutcome, { label: string; tone: string }> = {
  auto: { label: "Applied automatically", tone: "bg-brand-soft text-brand-ink" },
  review: { label: "Waiting for review", tone: "bg-amber-soft text-amber" },
  accepted: { label: "Accepted by an admin", tone: "bg-ok-soft text-ok" },
  overridden: { label: "Corrected by staff", tone: "bg-sunken text-muted" },
  failed: { label: "Couldn’t run", tone: "bg-danger-soft text-danger" },
};

type Triage = { outcome: TriageOutcome; category: string | null; priority: Priority | null; confidence: number | null; reason: string | null };

// Ticket sidebar card: what Relay AI suggested and what happened to the suggestion. Staff only.
export function TriageCard({ ticketId, triage, isAdmin }: { ticketId: number; triage: Triage; isAdmin: boolean }) {
  const pending = triage.outcome === "review" || triage.outcome === "failed";
  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <AiChip />
        <span className={`rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium ${OUTCOME[triage.outcome].tone}`}>{OUTCOME[triage.outcome].label}</span>
      </div>
      {triage.category && triage.priority ? (
        <dl className="space-y-2 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Category</dt>
            <dd className="font-medium">{triage.category}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Priority</dt>
            <dd>
              <PriorityTag priority={triage.priority} />
            </dd>
          </div>
          {triage.confidence !== null && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Confidence</dt>
              <dd>
                <Confidence value={triage.confidence} />
              </dd>
            </div>
          )}
        </dl>
      ) : null}
      {triage.reason && <p className="perf border-t pt-3 text-[12px] text-muted">{triage.reason}</p>}
      {isAdmin && pending && (
        <div className="flex flex-wrap gap-2">
          {triage.category && (
            <ConfirmButton action={acceptTriage.bind(null, ticketId)} className="btn-primary h-8">
              Accept suggestion
            </ConfirmButton>
          )}
          <ConfirmButton action={dismissTriage.bind(null, ticketId)} className="btn-ghost h-8">
            Dismiss
          </ConfirmButton>
        </div>
      )}
    </section>
  );
}
