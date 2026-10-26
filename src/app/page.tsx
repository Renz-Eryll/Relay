import Link from "next/link";
import { redirect } from "next/navigation";
import DemoButtons from "@/components/DemoButtons";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar, PriorityTag, RelayTrack, StatusBadge } from "@/components/ui";
import type { Status } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { HOME } from "@/lib/session";

// How a ticket moves: one leg per status, and who carries it.
const LEGS: { status: Status; holder: string; body: string }[] = [
  { status: "open", holder: "Customer", body: "Raised in a category. That team is notified right away." },
  { status: "in_progress", holder: "Agent", body: "Claimed by an agent or assigned by an admin. Replies stay in one thread." },
  { status: "resolved", holder: "Agent", body: "Marked as fixed. The customer is told and can confirm." },
  { status: "closed", holder: "Customer", body: "Closed for good, or reopened to the same agent with the full history." },
];

const ROLES = [
  {
    title: "Customers",
    points: ["Raise a ticket in the right category", "Follow status and replies in one thread", "Close or reopen it themselves"],
    pages: ["My tickets", "New ticket", "Notifications", "Help"],
  },
  {
    title: "Agents",
    points: ["A queue for their category", "Claim unassigned tickets", "Reply, set priority, resolve"],
    pages: ["My queue", "Tickets", "Notifications"],
  },
  {
    title: "Admins",
    points: ["Dashboard of open and unassigned work", "Assign the right agent", "Manage agents and categories"],
    pages: ["Dashboard", "All tickets", "Categories", "Agents"],
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
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#relay" className="btn-ghost hidden md:inline-flex">
            How it works
          </a>
          <a href="#roles" className="btn-ghost hidden md:inline-flex">
            Roles
          </a>
          <ThemeToggle className="text-muted hover:bg-sunken hover:text-ink" />
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary hidden sm:inline-flex">
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pt-10 pb-20 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <div>
          <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-line px-3 py-1">
            <span className="size-1.5 animate-pulse rounded-full bg-brand" aria-hidden />
            Support desk · live demo
          </p>
          <h1 className="display mt-6 text-[38px] leading-[1.02] sm:text-[52px]">
            Tickets change hands.
            <br />
            The thread <span className="text-brand">never breaks.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[16px] text-muted">
            Relay routes each ticket to the right team, keeps the whole conversation in one thread, and records every change.
          </p>
          <div className="mt-9 max-w-lg">
            <p className="eyebrow mb-3">Try the live demo as</p>
            <DemoButtons />
          </div>
        </div>

        {/* Product preview built from the real UI pieces */}
        <div className="relative">
          <div className="perf absolute inset-0 translate-x-3 translate-y-3 rounded-[6px] border" aria-hidden />
          <div className="card relative overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)]">
            <div className="perf flex items-center justify-between gap-3 border-b bg-sunken/50 px-5 py-3">
              <span className="num text-[13px] font-medium text-brand-ink">#1042</span>
              <span className="eyebrow">POS &amp; Retail</span>
            </div>
            <div className="px-5 pt-4 pb-5">
              <p className="text-[17px] font-semibold">Receipt printer stops after every 5 transactions</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StatusBadge status="in_progress" />
                <PriorityTag priority="high" />
              </div>
              <RelayTrack status="in_progress" className="mt-5" />
            </div>
            <ol className="relative space-y-3 border-t border-line px-5 py-5 before:absolute before:top-9 before:bottom-9 before:left-[35px] before:w-px before:bg-line-strong">
              <li className="relative flex gap-3">
                <span className="relative z-10 rounded-full ring-4 ring-surface">
                  <Avatar name="Ramon Dela Cruz" />
                </span>
                <div className="min-w-0 flex-1 rounded-[6px] border border-line p-3">
                  <p className="text-[12px] font-medium">Ramon Dela Cruz</p>
                  <p className="mt-1 text-[13px] text-muted">Our front counter printer goes offline after a few receipts and we have to restart the POS app.</p>
                </div>
              </li>
              <li className="relative flex items-center gap-3 text-[12px] text-muted">
                <span className="relative z-10 grid size-8 shrink-0 place-items-center" aria-hidden>
                  <span className="size-2.5 rotate-45 border border-brand bg-surface" />
                </span>
                <span>
                  <span className="font-medium text-ink">Dana Cruz</span> assigned the ticket to Miguel Santos <span className="num text-faint">· 2h ago</span>
                </span>
              </li>
              <li className="relative flex gap-3">
                <span className="relative z-10 rounded-full ring-4 ring-surface">
                  <Avatar name="Miguel Santos" />
                </span>
                <div className="min-w-0 flex-1 rounded-[6px] border border-line border-l-2 border-l-brand p-3">
                  <p className="flex items-center gap-2 text-[12px] font-medium">
                    Miguel Santos <span className="num rounded-[4px] bg-brand-soft px-1.5 text-[10px] tracking-wide text-brand-ink uppercase">Agent</span>
                  </p>
                  <p className="mt-1 text-[13px] text-muted">Thanks Ramon. I’ve pushed a fix that keeps the print queue alive. Can you try a test sale?</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* The relay */}
      <section id="relay" className="scroll-mt-6 border-y border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">How a ticket moves</p>
          <h2 className="display mt-3 max-w-2xl text-[30px] leading-tight sm:text-[36px]">Four legs. Every handoff on the record.</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {LEGS.map((leg, i) => (
              <li key={leg.status} className="relative lg:pr-8">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-brand bg-paper font-mono text-[11px] font-semibold text-brand-ink">{String(i + 1).padStart(2, "0")}</span>
                  {/* Track to the next leg */}
                  <span className={`hidden h-0.5 flex-1 lg:block ${i < LEGS.length - 1 ? "bg-[linear-gradient(90deg,var(--color-brand),var(--color-line-strong))]" : "perf border-t-2 bg-transparent"}`} aria-hidden />
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <StatusBadge status={leg.status} />
                  <span className="eyebrow">· {leg.holder}</span>
                </div>
                <p className="mt-3 max-w-[16rem] text-[14px] text-muted">{leg.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-20">
        <p className="eyebrow">Three seats, one desk</p>
        <h2 className="display mt-3 max-w-2xl text-[30px] leading-tight sm:text-[36px]">Everyone sees exactly their part.</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[6px] border border-line bg-line md:grid-cols-3">
          {ROLES.map((r, i) => (
            <div key={r.title} className="flex flex-col bg-surface p-6">
              <p className="num text-[12px] text-brand-ink">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="display mt-2 text-[20px]">{r.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {r.points.map((p) => (
                  <li key={p} className="flex gap-2.5 text-[14px] text-muted">
                    <span className="mt-[9px] h-px w-3 shrink-0 bg-brand" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="perf mt-6 flex flex-wrap gap-1.5 border-t pt-4">
                {r.pages.map((pg) => (
                  <span key={pg} className="num rounded-[4px] bg-sunken px-1.5 py-0.5 text-[11px] text-muted">
                    {pg}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spec sheet */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-10 lg:grid-cols-[18rem_1fr]">
          <div>
            <p className="eyebrow">Under the hood</p>
            <h2 className="display mt-3 text-[26px] leading-tight">Built like a real desk.</h2>
          </div>
          <dl className="divide-y divide-line border-y border-line">
            {FEATURES.map(([title, body]) => (
              <div key={title} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
                <dt className="font-semibold">{title}</dt>
                <dd className="text-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing band */}
      <section className="lanes border-t border-rail-line bg-rail">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 py-16 lg:grid-cols-[1fr_28rem]">
          <div>
            <h2 className="display text-[30px] leading-tight text-rail-ink sm:text-[36px]">
              Take a seat. <span className="text-brand">Take the baton.</span>
            </h2>
            <p className="mt-3 text-rail-muted">The demo workspace resets every day, so click around freely.</p>
          </div>
          <DemoButtons tone="dark" />
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
