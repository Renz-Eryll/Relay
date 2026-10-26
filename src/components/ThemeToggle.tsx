"use client";

// Flips data-theme on <html>; the choice is kept in localStorage and restored before paint (see app/layout.tsx).
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("relay-theme", next);
    } catch {}
  };

  return (
    <button type="button" onClick={toggle} aria-label="Switch colour theme" title="Switch theme" className={`grid size-9 place-items-center rounded-[6px] transition-colors ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[18px] dark:hidden" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="hidden size-[18px] dark:block" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
        <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
