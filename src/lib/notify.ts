import "server-only";
import { and, eq, inArray, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { ticketRef } from "./labels";

type Note = { title: string; body: string; ticketId: number };

export async function notifyUsers(userIds: (string | null | undefined)[], note: Note, exceptId?: string) {
  const ids = [...new Set(userIds.filter((id): id is string => !!id && id !== exceptId))];
  if (ids.length) await db.insert(notifications).values(ids.map((userId) => ({ userId, ...note })));
}

// Staff who should hear about an unassigned ticket: admins and agents in its category.
export async function staffFor(categoryId: number, exceptId?: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        or(eq(users.role, "admin"), and(eq(users.role, "agent"), eq(users.categoryId, categoryId))),
        exceptId ? ne(users.id, exceptId) : undefined,
      ),
    );
  return rows.map((r) => r.id);
}

export async function adminIds() {
  const rows = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["admin"]));
  return rows.map((r) => r.id);
}

export const titled = (id: number, subject: string) => `${ticketRef(id)} · ${subject}`;
