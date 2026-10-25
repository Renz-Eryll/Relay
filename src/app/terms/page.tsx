import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

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
    <div className="min-h-dvh bg-surface">
      <header className="mx-auto max-w-3xl px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-[30px] font-semibold tracking-tight">Terms of use</h1>
        <p className="mt-2 text-muted">Plain-language terms for this portfolio project.</p>
        <div className="mt-8 space-y-6">
          {SECTIONS.map(([title, body]) => (
            <section key={title}>
              <h2 className="text-[16px] font-semibold">{title}</h2>
              <p className="mt-1.5 text-muted">{body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
