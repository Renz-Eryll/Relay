import type { Metadata } from "next";
import Link from "next/link";
import { acceptTriage, dismissTriage } from "@/app/actions/ai";
import { AiChip, Confidence, OUTCOME } from "@/components/ai";
import { ConfirmButton } from "@/components/forms";
import { EmptyState, PageHeader, PriorityTag } from "@/components/ui";
import { aiEnabled } from "@/lib/ai/provider";
import { reviewQueue } from "@/lib/ai/queries";
import { AUTO_APPLY_THRESHOLD } from "@/lib/ai/triage";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { ticketRef } from "@/lib/labels";

export const metadata: Metadata = { title: "Needs review" };

export default async function TriageReviewPage() {
  await requireUser("admin");
  const queue = await reviewQueue();

  return (
    <>
      <PageHeader
        title="Needs review"
        description={`New tickets Relay AI wasn’t sure about (under ${Math.round(AUTO_APPLY_THRESHOLD * 100)}% confident) or couldn’t classify. Accept the suggestion, or open the ticket and triage it yourself.`}
      />

      {!aiEnabled() && (
        <p className="mb-5 rounded-[6px] border border-line bg-sunken px-4 py-3 text-[13px] text-muted">
          Relay AI is turned off on this deployment, so new tickets aren’t being triaged automatically.
        </p>
      )}

      {queue.length === 0 ? (
        <EmptyState title="Nothing to review" body="Every new ticket was either confident enough to route automatically or has already been handled." />
      ) : (
        <ul className="space-y-3">
          {queue.map((t) => (
            <li key={t.ticketId} className="card overflow-hidden md:grid md:grid-cols-[1fr_19rem]">
              <div className="min-w-0 p-5">
                <p className="num text-[12px] text-faint">
                  <span className="text-brand-ink">{ticketRef(t.ticketId)}</span> · {t.customerName} · {timeAgo(t.createdAt)}
                </p>
                <Link href={`/tickets/${t.ticketId}`} className="mt-1 block font-semibold hover:underline">
                  {t.subject}
                </Link>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted">{t.description}</p>
                <p className="mt-3 text-[12px] text-faint">
                  Customer chose <span className="font-medium text-muted">{t.currentCategory}</span>
                </p>
              </div>

              <div className="perf space-y-3 border-t bg-sunken/40 p-5 md:border-t-0 md:border-l">
                <div className="flex items-center justify-between gap-2">
                  <AiChip />
                  {t.outcome === "failed" && <span className={`rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium ${OUTCOME.failed.tone}`}>{OUTCOME.failed.label}</span>}
                </div>
                {t.category && t.priority ? (
                  <>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
                      <span className="font-medium">{t.category}</span>
                      <PriorityTag priority={t.priority} />
                      {t.confidence !== null && <Confidence value={t.confidence} />}
                    </div>
                    {t.reason && <p className="text-[12px] text-muted">{t.reason}</p>}
                    <p className="text-[12px] text-faint">{t.suggestedAgent ? `Would assign ${t.suggestedAgent}` : "No agent in that category yet"}</p>
                  </>
                ) : (
                  <p className="text-[12px] text-muted">{t.reason ?? "No suggestion."}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {t.category && (
                    <ConfirmButton action={acceptTriage.bind(null, t.ticketId)} className="btn-primary h-8">
                      Accept
                    </ConfirmButton>
                  )}
                  <Link href={`/tickets/${t.ticketId}`} className="btn-outline h-8">
                    Open ticket
                  </Link>
                  <ConfirmButton action={dismissTriage.bind(null, t.ticketId)} className="btn-ghost h-8">
                    Dismiss
                  </ConfirmButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
