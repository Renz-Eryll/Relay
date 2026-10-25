import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Help & FAQs" };

const FAQS = [
  {
    group: "Tickets",
    items: [
      ["How quickly will someone reply?", "Tickets are picked up by the team for their category, usually within the same business day. Urgent tickets are prioritised."],
      ["How do I know my ticket is being worked on?", "You’ll get a notification when an agent is assigned and when they reply. The status changes to “In progress” as soon as work starts."],
      ["Can I add more information after submitting?", "Yes. Open the ticket and post a reply. The assigned agent is notified right away."],
    ],
  },
  {
    group: "Statuses",
    items: [
      ["What do the statuses mean?", "Open: waiting for an agent. In progress: an agent is working on it. Resolved: the agent believes it’s fixed. Closed: the ticket is finished."],
      ["My issue came back after it was resolved", "Open the ticket and choose “Reopen ticket”. It goes back to the same agent with the full history."],
      ["Can I close a ticket myself?", "Yes. If you no longer need help, open the ticket and choose “Close ticket”."],
    ],
  },
  {
    group: "Account",
    items: [
      ["I forgot my password", "Use “Forgot password?” on the sign-in page. We’ll email you a 6-digit code that’s valid for 10 minutes."],
      ["How do I change my email or password?", "Go to Settings. Changing your password requires your current one."],
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Help & FAQs" description="Answers to common questions. Still stuck? Raise a ticket and we’ll help." />
      <div className="space-y-8">
        {FAQS.map((g) => (
          <section key={g.group}>
            <h2 className="eyebrow mb-2">{g.group}</h2>
            <div className="card divide-y divide-line">
              {g.items.map(([q, a]) => (
                <details key={q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {q}
                    <span className="text-faint transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-[13px] text-muted">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="card mt-8 flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-[14px]">Didn’t find what you need?</p>
        <Link href="/tickets/new" className="btn-primary">
          Raise a ticket
        </Link>
      </div>
    </div>
  );
}
