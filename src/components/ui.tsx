import Link from "next/link";
import type { ReactNode } from "react";
import type { Priority, Status } from "@/db/schema";
import { initials } from "@/lib/format";
import { PRIORITY, STATUS } from "@/lib/labels";

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium ${STATUS[status].tone}`}>{STATUS[status].label}</span>;
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
    <div className="mb-7">
      {back && (
        <Link href={back.href} className="mb-3 inline-block text-[13px] text-muted hover:text-ink">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-muted">{description}</p>}
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
            <dt className="eyebrow">{item.label}</dt>
            <dd className="num mt-1.5 text-[26px] leading-none font-medium">{item.value}</dd>
            {item.hint && <p className="mt-1.5 truncate text-xs text-muted">{item.hint}</p>}
          </>
        );
        return item.href ? (
          <Link key={item.label} href={item.href} className="min-w-0 bg-surface px-5 py-4 transition-colors hover:bg-sunken/50">
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
      <h2 className="text-[15px] font-semibold">{children}</h2>
      {aside}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
