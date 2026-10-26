import Link from "next/link";
import type { ReactNode } from "react";
import type { Priority, Status } from "@/db/schema";
import { initials } from "@/lib/format";
import { PRIORITY, STATUS, STATUSES } from "@/lib/labels";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium ${STATUS[status].tone}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS[status].label}
    </span>
  );
}

// The relay: each status is one leg. Done legs are filled, the current leg carries the baton.
export function RelayTrack({ status, className = "" }: { status: Status; className?: string }) {
  const at = STATUSES.indexOf(status);
  return (
    <ol className={`grid grid-cols-4 gap-1.5 ${className}`} aria-label={`Status: ${STATUS[status].label}`}>
      {STATUSES.map((s, i) => (
        <li key={s} className="min-w-0" aria-current={i === at ? "step" : undefined}>
          <span className="relative block h-1.5 rounded-full bg-line-strong/70">
            {i <= at && <span className={`absolute inset-y-0 left-0 rounded-full bg-brand ${i < at ? "right-0" : "right-1/2"}`} />}
            {i === at && <span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-surface" />}
          </span>
          <span className={`mt-2 hidden truncate text-[11px] sm:block ${i === at ? "font-semibold text-ink" : i < at ? "text-muted" : "text-faint"}`}>
            <span className="num mr-1 text-faint">{String(i + 1).padStart(2, "0")}</span>
            {STATUS[s].label}
          </span>
        </li>
      ))}
      {/* Phones: one line for the current leg instead of four cramped labels. */}
      <li className="col-span-4 text-[11px] sm:hidden" aria-hidden>
        <span className="num text-faint">Leg {at + 1}/4 · </span>
        <span className="font-semibold">{STATUS[status].label}</span>
      </li>
    </ol>
  );
}

const PRIORITY_BARS: Record<Priority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };

// Signal bars + label, so priority never relies on colour alone.
export function PriorityTag({ priority }: { priority: Priority }) {
  const bars = PRIORITY_BARS[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${PRIORITY[priority].tone}`}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((b) => (
          <span key={b} className={`w-[3px] rounded-[1px] ${b <= bars ? "bg-current" : "bg-line-strong"}`} style={{ height: 3 + b * 2 }} />
        ))}
      </span>
      {PRIORITY[priority].label}
    </span>
  );
}

const AVATAR_TONES = ["bg-brand-soft text-brand-ink", "bg-sky-soft text-sky", "bg-amber-soft text-amber", "bg-ok-soft text-ok", "bg-sunken text-muted"];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-semibold ${tone} ${size === "sm" ? "size-6 text-[10px]" : "size-8 text-[11px]"}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back.href} className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-ink">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[28px] leading-[1.1] sm:text-[32px]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatStrip({ items }: { items: { label: string; value: ReactNode; hint?: ReactNode; href?: string }[] }) {
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-line bg-line ${items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {items.map((item) => {
        const body = (
          <>
            <dt className="eyebrow flex items-center justify-between gap-2">
              {item.label}
              {item.href && (
                <span className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-ink" aria-hidden>
                  →
                </span>
              )}
            </dt>
            <dd className="num mt-2.5 text-[30px] leading-none font-medium tracking-tight">{item.value}</dd>
            {item.hint && <p className="mt-2 truncate text-xs text-muted">{item.hint}</p>}
          </>
        );
        return item.href ? (
          <Link key={item.label} href={item.href} className="group relative min-w-0 bg-surface px-5 py-4 transition-colors hover:bg-sunken/60">
            {body}
          </Link>
        ) : (
          <div key={item.label} className="min-w-0 bg-surface px-5 py-4">
            {body}
          </div>
        );
      })}
    </dl>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <span className="h-3.5 w-[3px] rounded-full bg-brand" aria-hidden />
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="perf rounded-[6px] border bg-surface/50 px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Quiet one-line empty message inside a section.
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="perf rounded-[6px] border px-5 py-8 text-center text-[13px] text-muted">{children}</p>;
}
