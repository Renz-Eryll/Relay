import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Terms" };

const SECTIONS = [
  ["Using Relay", "Relay is a demonstration support desk. Use it to raise and track support requests. Don’t submit sensitive personal, financial or health information."],
  ["Your account", "Keep your password private. You’re responsible for activity on your account. You can update your details or reset your password at any time."],
  ["Your data", "Tickets, replies and your profile are stored to provide the service. Agents and admins can read tickets you raise so they can help you."],
  ["Demo workspace", "The shared demo accounts and their data are reset every day. Anything entered with a demo account may be seen by other visitors and is deleted at the next reset."],
  ["Changes", "These terms may change as the project evolves. Continued use means you accept the current version."],
];

export default function TermsPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
        <ThemeToggle className="text-muted hover:bg-sunken hover:text-ink" />
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="display text-[32px] leading-tight">Terms of use</h1>
        <p className="mt-2 text-muted">Plain-language terms for this portfolio project.</p>
        <div className="mt-10 space-y-7">
          {SECTIONS.map(([title, body], i) => (
            <section key={title} className="grid gap-1 sm:grid-cols-[3rem_1fr]">
              <span className="num pt-0.5 text-[12px] text-brand-ink">{String(i + 1).padStart(2, "0")}</span>
              <div>
              <h2 className="text-[16px] font-semibold">{title}</h2>
              <p className="mt-1.5 text-muted">{body}</p>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
