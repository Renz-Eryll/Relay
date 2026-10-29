import Link from "next/link";
import { logout } from "@/app/actions/auth";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import { Icon, SideNav, type NavItem } from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { reviewCount } from "@/lib/ai/queries";
import { unreadCount } from "@/lib/data";
import { HOME } from "@/lib/session";

const ROLE_LABEL = { customer: "Customer", agent: "Support agent", admin: "Admin" } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [unread, review] = await Promise.all([unreadCount(user.id), user.role === "admin" ? reviewCount() : Promise.resolve(0)]);

  const items: NavItem[] =
    user.role === "admin"
      ? [
          { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
          { href: "/tickets", label: "All tickets", icon: "tickets" },
          { href: "/triage", label: "Needs review", icon: "ai", badge: review },
          { href: "/categories", label: "Categories", icon: "categories" },
          { href: "/agents", label: "Agents", icon: "agents" },
          { href: "/notifications", label: "Notifications", icon: "notifications", badge: unread },
        ]
      : user.role === "agent"
        ? [
            { href: "/queue", label: "My queue", icon: "queue" },
            { href: "/tickets", label: "Tickets", icon: "tickets" },
            { href: "/notifications", label: "Notifications", icon: "notifications", badge: unread },
          ]
        : [
            { href: "/tickets", label: "My tickets", icon: "tickets" },
            { href: "/tickets/new", label: "New ticket", icon: "new" },
            { href: "/notifications", label: "Notifications", icon: "notifications", badge: unread },
            { href: "/help", label: "Help & FAQs", icon: "help" },
          ];

  // Settings + who is signed in: bottom of the rail, and of the mobile panel.
  const account = (
    <>
      <SideNav items={[{ href: "/settings", label: "Settings", icon: "settings" }]} />
      <div className="mt-3 flex items-center gap-3 border-t border-rail-line pt-4">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-rail-ink">{user.name}</p>
          <p className="truncate text-xs text-rail-muted">{user.isDemo ? "Demo account" : user.email}</p>
        </div>
        <form action={logout}>
          <button className="grid size-8 place-items-center rounded-[6px] text-rail-muted hover:bg-rail-2 hover:text-rail-ink" title="Sign out" aria-label="Sign out">
            <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-rail px-3 py-5 lg:flex">
        <Link href={HOME[user.role]} className="px-3">
          <Logo tone="light" />
        </Link>
        <p className="eyebrow mt-7 mb-2 flex items-center gap-2 px-3 text-rail-muted/80">
          <span className="size-1.5 rounded-full bg-brand" aria-hidden />
          {ROLE_LABEL[user.role]}
        </p>
        <div className="px-3">
          <SideNav items={items} />
        </div>
        <div className="mt-auto px-3">{account}</div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-rail-line bg-rail px-3 lg:hidden">
          <MobileNav
            items={items}
            header={<Logo tone="light" />}
            label={
              <p className="eyebrow mb-2 flex items-center gap-2 text-rail-muted/80">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                {ROLE_LABEL[user.role]}
              </p>
            }
            footer={account}
          />
          <Link href={HOME[user.role]}>
            <Logo tone="light" />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle className="text-rail-muted hover:bg-rail-2 hover:text-rail-ink" />
            <Link href="/notifications" className="relative grid size-9 place-items-center rounded-[6px] text-rail-muted hover:bg-rail-2 hover:text-rail-ink" aria-label={`Notifications, ${unread} unread`}>
              <Icon name="notifications" />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand ring-2 ring-rail" aria-hidden />}
            </Link>
          </div>
        </header>

        <div className="flex h-14 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur sm:px-8 lg:sticky lg:top-0 lg:z-10">
          <form action="/tickets" className="relative w-full lg:max-w-sm">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="m20 20-4.5-4.5M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" strokeLinecap="round" />
            </svg>
            <input name="q" aria-label="Search tickets" placeholder="Search tickets or #number" className="field h-9 pl-9 text-[13px]" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            {user.isDemo && (
              <span className="num hidden items-center gap-1.5 rounded-[4px] border border-brand/30 bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand-ink sm:inline-flex">
                <span className="size-1.5 animate-pulse rounded-full bg-brand" aria-hidden />
                Demo · resets daily
              </span>
            )}
            <ThemeToggle className="hidden text-muted hover:bg-sunken hover:text-ink lg:grid" />
            <Link href="/notifications" className="relative hidden size-9 place-items-center rounded-[6px] text-muted hover:bg-sunken hover:text-ink lg:grid" aria-label={`Notifications, ${unread} unread`}>
              <Icon name="notifications" />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand ring-2 ring-paper" aria-hidden />}
            </Link>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
