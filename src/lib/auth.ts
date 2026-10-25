import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { HOME, SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type Role, type Session } from "./session";

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

// The signed-in user, re-read from the database once per request so a deleted
// account or changed role takes effect immediately.
export const currentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  return user ?? null;
});

export async function requireUser(...roles: Role[]) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role)) redirect(HOME[user.role]);
  return user;
}

export async function startSession(session: Session) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export class ActionError extends Error {}

export type ActionState = { error?: string; ok?: string } | undefined;

// Turn thrown ActionErrors into form state; let anything else (redirects, bugs) propagate.
export async function runAction(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? undefined;
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
}

// Inside an action: the current user, required to have one of `roles`.
export async function actor(...roles: Role[]) {
  const user = await currentUser();
  if (!user) throw new ActionError("Your session has expired. Sign in again.");
  if (roles.length && !roles.includes(user.role)) throw new ActionError("You don’t have access to do that.");
  return user;
}
