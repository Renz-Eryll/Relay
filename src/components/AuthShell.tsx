import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

// Sample board rows: ref, subject, who holds it, leg (1 open … 4 closed).
const BOARD: [string, string, string, number][] = [
  ["#1044", "Add cashier for Branch 2", "Unassigned", 1],
  ["#1042", "Receipt printer goes offline", "M. Santos", 2],
  ["#1041", "Export sales to CSV", "A. Reyes", 2],
  ["#1039", "Payments not posting", "M. Santos", 3],
  ["#1036", "Change store hours", "J. Lim", 4],
];
const LEG = ["Open", "In progress", "Resolved", "Closed"];

// Split auth layout: the form on the left, the live board on the right.
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <main className="flex flex-col bg-paper px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <ThemeToggle className="text-muted hover:bg-sunken hover:text-ink" />
        </div>
        <div className="m-auto w-full max-w-[380px] py-12">{children}</div>
        <p className="text-xs text-faint">
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </p>
      </main>

      <aside className="lanes relative hidden overflow-hidden border-l border-rail-line bg-rail p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto w-full max-w-lg">
          <p className="eyebrow flex items-center gap-2 text-rail-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-brand" aria-hidden />
            Support desk · live board
          </p>
          <p className="display mt-4 text-[38px] leading-[1.05] text-rail-ink">
            Every request,
            <br />
            <span className="text-brand">one clear thread.</span>
          </p>
          <p className="mt-4 max-w-md text-[14px] text-rail-muted">Customers see progress. Agents see their queue. Admins see everything, with a full audit trail.</p>

          <div className="mt-10 overflow-hidden rounded-[6px] border border-rail-line bg-rail-2/70">
            <div className="grid grid-cols-[4rem_1fr_6rem_7.5rem] gap-3 border-b border-rail-line px-4 py-2 font-mono text-[10px] tracking-[0.1em] text-rail-muted uppercase">
              <span>Ref</span>
              <span>Request</span>
              <span>With</span>
              <span>Leg</span>
            </div>
            {BOARD.map(([ref, subject, holder, leg]) => (
              <div key={ref} className="grid grid-cols-[4rem_1fr_6rem_7.5rem] items-center gap-3 border-b border-rail-line px-4 py-3 last:border-b-0">
                <span className="num text-[12px] text-brand">{ref}</span>
                <span className="truncate text-[13px] text-rail-ink">{subject}</span>
                <span className={`truncate text-[12px] ${holder === "Unassigned" ? "text-rail-muted/70 italic" : "text-rail-muted"}`}>{holder}</span>
                <span className="flex items-center gap-2">
                  <span className="flex gap-0.5" aria-hidden>
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1 w-3 rounded-full ${i <= leg ? "bg-brand" : "bg-rail-line"}`} />
                    ))}
                  </span>
                  <span className="truncate text-[11px] text-rail-muted">{LEG[leg - 1]}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
