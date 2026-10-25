export default function Logo({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[16px] font-semibold tracking-tight ${tone === "light" ? "text-rail-ink" : "text-ink"} ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-brand" />
        <path d="M9 11h10.5a3.5 3.5 0 0 1 0 7H14l5 5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 11v12" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      Relay
    </span>
  );
}
