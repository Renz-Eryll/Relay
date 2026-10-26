import { demoLogin } from "@/app/actions/auth";
import { SubmitButton } from "./forms";

const ROLES = [
  { role: "customer", label: "Customer", hint: "Raise and follow tickets" },
  { role: "agent", label: "Agent", hint: "Work a category queue" },
  { role: "admin", label: "Admin", hint: "Assign, manage, report" },
] as const;

export default function DemoButtons({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ROLES.map((r, i) => (
        <form key={r.role} action={demoLogin.bind(null, r.role)}>
          <SubmitButton
            pending="Opening…"
            className={`btn group h-auto w-full flex-col items-start gap-1 px-3 py-2.5 text-left whitespace-normal ${
              tone === "dark" ? "border border-rail-line bg-rail-2 text-rail-ink hover:border-brand" : "border border-line-strong bg-surface hover:border-brand hover:bg-brand-soft/30"
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="num text-[10px] text-brand-ink">{String(i + 1).padStart(2, "0")}</span>
              <span className={`transition-transform group-hover:translate-x-0.5 ${tone === "dark" ? "text-rail-muted" : "text-faint"} group-hover:text-brand`} aria-hidden>
                →
              </span>
            </span>
            <span className="text-[13px] font-semibold">{r.label}</span>
            <span className={`text-[11px] leading-snug font-normal ${tone === "dark" ? "text-rail-muted" : "text-muted"}`}>{r.hint}</span>
          </SubmitButton>
        </form>
      ))}
    </div>
  );
}
