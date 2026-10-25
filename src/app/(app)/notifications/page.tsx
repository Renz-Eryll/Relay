import type { Metadata } from "next";
import Link from "next/link";
import { markAllRead } from "@/app/actions/people";
import { ConfirmButton } from "@/components/forms";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/data";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You’re all caught up."}
        actions={
          unread > 0 && (
            <ConfirmButton action={markAllRead} className="btn-outline">
              Mark all as read
            </ConfirmButton>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState title="No notifications yet" body="Replies, assignments and status changes on your tickets show up here." />
      ) : (
        <ul className="card divide-y divide-line">
          {items.map((n) => {
            const body = (
              <>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand"}`} aria-label={n.readAt ? undefined : "Unread"} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14px] ${n.readAt ? "text-muted" : "font-medium"}`}>{n.title}</span>
                  <span className="block truncate text-[13px] text-muted">{n.body}</span>
                </span>
                <span className="shrink-0 text-xs text-faint">{timeAgo(n.createdAt)}</span>
              </>
            );
            return (
              <li key={n.id}>
                {n.ticketId ? (
                  <Link href={`/tickets/${n.ticketId}`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-sunken/50">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-5 py-3.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
