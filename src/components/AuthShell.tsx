import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "./Logo";

// Split auth layout: the form on the left, a quiet product panel on the right.
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <main className="flex flex-col bg-surface px-6 py-8 sm:px-12">
        <Link href="/">
          <Logo />
        </Link>
        <div className="m-auto w-full max-w-[380px] py-12">{children}</div>
        <p className="text-xs text-faint">
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </p>
      </main>
      <aside className="relative hidden overflow-hidden bg-rail p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto w-full max-w-md">
          <p className="text-[28px] leading-tight font-semibold tracking-tight text-rail-ink">
            Every request, <span className="text-brand">one clear thread.</span>
          </p>
          <p className="mt-3 text-[14px] text-rail-muted">Customers see progress. Agents see their queue. Admins see everything, with a full audit trail.</p>
          <div className="mt-10 space-y-2.5">
            {[
              ["#1042", "Receipt printer goes offline", "In progress", "bg-amber-soft text-amber"],
              ["#1039", "Payments not posting", "Resolved", "bg-ok-soft text-ok"],
              ["#1044", "Add cashier for Branch 2", "Open", "bg-sky-soft text-sky"],
            ].map(([ref, subject, status, tone]) => (
              <div key={ref} className="flex items-center gap-3 rounded-[6px] border border-rail-line bg-rail-2 px-4 py-3">
                <span className="num text-[12px] text-rail-muted">{ref}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-rail-ink">{subject}</span>
                <span className={`rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
