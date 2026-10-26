"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

export const ICONS = {
  dashboard: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
  queue: <path d="M4 6h16M4 12h16M4 18h10" />,
  tickets: <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7Zm10-2v12" />,
  new: <path d="M12 5v14M5 12h14" />,
  categories: <path d="M4 5h6v6H4V5Zm10 0h6v6h-6V5ZM4 15h6v4H4v-4Zm10 0h6v4h-6v-4Z" />,
  agents: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M21 20a6 6 0 0 0-3.5-5.5" />,
  notifications: <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 3.5a2 2 0 0 0 4 0" />,
  help: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14m0 3v.01" />,
  settings: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />,
};

export function Icon({ name, className = "size-[18px]" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

// "/tickets" should not light up on "/tickets/new".
const isActive = (pathname: string, href: string, all: NavItem[]) =>
  pathname === href || (pathname.startsWith(`${href}/`) && !all.some((i) => i.href !== href && i.href.startsWith(href) && pathname.startsWith(i.href)));

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href, items);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-[6px] px-3 py-2 text-[14px] transition-colors ${
              active ? "bg-rail-2 font-medium text-rail-ink" : "text-rail-muted hover:bg-rail-2/60 hover:text-rail-ink"
            }`}
          >
            {/* The baton: active page marker. */}
            {active && <span className="absolute top-1/2 -left-3 h-5 w-[4px] -translate-y-1/2 rounded-r-full bg-brand shadow-[0_0_12px_var(--color-brand)]" aria-hidden />}
            <span className={active ? "text-brand" : ""}>
              <Icon name={item.icon} />
            </span>
            <span className="flex-1">{item.label}</span>
            {!!item.badge && (
              <span className="num rounded-[4px] bg-brand px-1.5 text-[11px] leading-5 font-semibold text-on-brand" aria-label={`${item.badge} unread`}>
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
