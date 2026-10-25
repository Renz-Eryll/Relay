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
      {ROLES.map((r) => (
        <form key={r.role} action={demoLogin.bind(null, r.role)}>
          <SubmitButton
            pending="Opening…"
            className={`btn h-auto w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left ${
              tone === "dark" ? "border border-rail-line bg-rail-2 text-rail-ink hover:border-brand" : "border border-line-strong bg-surface hover:border-brand"
            }`}
          >
            <span className="text-[13px] font-medium">{r.label}</span>
            <span className={`text-[11px] font-normal ${tone === "dark" ? "text-rail-muted" : "text-muted"}`}>{r.hint}</span>
          </SubmitButton>
        </form>
      ))}
    </div>
  );
}
