import Link from "next/link";
import { redirect } from "next/navigation";
import DemoButtons from "@/components/DemoButtons";
import Logo from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { HOME } from "@/lib/session";

const ROLES = [
  {
    title: "Customers",
    points: ["Raise a ticket in the right category", "Follow status and replies in one thread", "Close or reopen it themselves"],
  },
  {
    title: "Agents",
    points: ["A queue for their category", "Claim unassigned tickets", "Reply, set priority, resolve"],
  },
  {
    title: "Admins",
    points: ["Dashboard of open and unassigned work", "Assign the right agent", "Manage agents and categories"],
  },
];

const FEATURES = [
  ["Role-based access", "Customers see only their tickets. Agents see their queue. Admins see everything."],
  ["Audit trail", "Every status change, assignment and priority change is recorded with who and when."],
  ["Notifications", "New tickets, replies, assignments and status changes reach the right people."],
  ["Secure accounts", "Hashed passwords, signed sessions and email reset codes that expire in 10 minutes."],
];

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(HOME[session.role]);

  return (
    <div className="min-h-dvh bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-12 pb-20 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="eyebrow text-brand-ink">Support desk</p>
          <h1 className="mt-3 text-[44px] leading-[1.05] font-semibold tracking-tight sm:text-[54px]">
            Support your customers can actually <span className="text-brand">follow.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[16px] text-muted">
            Relay routes each ticket to the right team, keeps the whole conversation in one thread, and records every change.
          </p>
          <div className="mt-8 max-w-lg">
            <p className="mb-2.5 text-[13px] text-muted">Try the live demo as:</p>
            <DemoButtons />
          </div>
        </div>

        {/* Product preview built from the real UI pieces */}
        <div className="card overflow-hidden shadow-[0_24px_60px_rgba(15,23,32,0.12)]">
          <div className="flex items-center gap-2 border-b border-line bg-sunken/60 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="num ml-3 text-[11px] text-faint">#1042 · POS &amp; Retail</span>
          </div>
          <div className="space-y-3 p-5">
            <div>
              <p className="text-[17px] font-semibold">Receipt printer stops after every 5 transactions</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-[4px] bg-amber-soft px-1.5 py-0.5 text-[11px] font-medium text-amber">In progress</span>
                <span className="text-[12px] font-medium text-amber">High</span>
                <span className="text-[12px] text-muted">· assigned to Miguel Santos</span>
              </div>
            </div>
            {[
              ["Ramon Dela Cruz", "Our front counter printer goes offline after a few receipts and we have to restart the POS app.", false],
              ["Miguel Santos", "Thanks Ramon. I’ve pushed a fix that keeps the print queue alive. Can you try a test sale?", true],
            ].map(([name, body, staff]) => (
              <div key={String(name)} className={`rounded-[6px] border border-line p-3.5 ${staff ? "border-l-2 border-l-brand" : ""}`}>
                <p className="text-[12px] font-medium">
                  {name} {staff && <span className="ml-1 rounded-[4px] bg-brand-soft px-1.5 text-[10px] text-brand-ink">Agent</span>}
                </p>
                <p className="mt-1 text-[13px] text-muted">{body}</p>
              </div>
            ))}
            <p className="flex items-center gap-2 px-1 text-[11px] text-muted">
              <span className="size-1.5 rounded-full bg-line-strong" /> Dana Cruz assigned the ticket to Miguel Santos · 2h ago
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.title}>
              <h2 className="text-[17px] font-semibold">{r.title}</h2>
              <ul className="mt-3 space-y-2">
                {r.points.map((p) => (
                  <li key={p} className="flex gap-2 text-[14px] text-muted">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([title, body]) => (
            <div key={title}>
              <h3 className="text-[14px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[13px] text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-[12px] text-faint">
          <span>Relay · A portfolio project by Renz Eryll Ramelo</span>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
