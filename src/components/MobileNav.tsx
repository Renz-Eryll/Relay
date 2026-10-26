"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SideNav, type NavItem } from "./Nav";

// Small screens: a burger button that opens the rail as a slide-in panel.
export default function MobileNav({ items, header, label, footer }: { items: NavItem[]; header: ReactNode; label: ReactNode; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close after navigating.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const unread = items.reduce((n, i) => n + (i.badge ?? 0), 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="relative grid size-9 place-items-center rounded-[6px] text-rail-ink hover:bg-rail-2"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand ring-2 ring-rail" aria-hidden />}
      </button>

      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`} />
        <aside
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!open}
          className={`lanes absolute inset-y-0 left-0 flex w-[min(18rem,86vw)] flex-col border-r border-rail-line bg-rail px-3 py-5 shadow-2xl transition-transform duration-200 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-3">
            {header}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-[6px] text-rail-muted hover:bg-rail-2 hover:text-rail-ink">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="mt-7 flex-1 overflow-y-auto px-3">
            {label}
            <SideNav items={items} />
          </div>
          <div className="px-3">{footer}</div>
        </aside>
      </div>
    </>
  );
}
