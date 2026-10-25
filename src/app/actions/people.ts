"use server";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { categories, notifications, users } from "@/db/schema";
import { ActionError, actor, runAction, startSession, type ActionState } from "@/lib/auth";

const email = z.string().trim().toLowerCase().email("Enter a valid email");
const name = z.string().trim().min(2, "Enter a name").max(80);

async function emailTaken(address: string, exceptId?: string) {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, address));
  return !!row && row.id !== exceptId;
}

async function validCategory(id: number) {
  const [row] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id));
  if (!row) throw new ActionError("Choose a category");
}

// ----- Agents (admin only) -----

export async function createAgent(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await actor("admin");
    const parsed = z
      .object({ name, email, categoryId: z.coerce.number().int().positive("Choose a category"), password: z.string().min(8, "Temporary password needs at least 8 characters").max(200) })
      .safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    await validCategory(parsed.data.categoryId);
    if (await emailTaken(parsed.data.email)) return { error: "That email is already in use" };

    await db.insert(users).values({
      name: parsed.data.name,
      email: parsed.data.email,
      categoryId: parsed.data.categoryId,
      role: "agent",
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    });
    revalidatePath("/agents");
    return { ok: `${parsed.data.name} can now sign in` };
  });
}

export async function updateAgent(agentId: string, _: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await actor("admin");
    const parsed = z.object({ name, email, categoryId: z.coerce.number().int().positive("Choose a category") }).safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const [agent] = await db.select().from(users).where(and(eq(users.id, agentId), eq(users.role, "agent")));
    if (!agent) throw new ActionError("Agent not found");
    if (agent.isDemo && parsed.data.email !== agent.email) throw new ActionError("Demo agents keep their email so everyone can sign in.");
    await validCategory(parsed.data.categoryId);
    if (await emailTaken(parsed.data.email, agent.id)) return { error: "That email is already in use" };

    await db.update(users).set(parsed.data).where(eq(users.id, agent.id));
    revalidatePath("/agents");
    return { ok: "Saved" };
  });
}

export async function removeAgent(agentId: string, _: ActionState): Promise<ActionState> {
  return runAction(async () => {
    await actor("admin");
    const [agent] = await db.select().from(users).where(and(eq(users.id, agentId), eq(users.role, "agent")));
    if (!agent) throw new ActionError("Agent not found");
    if (agent.isDemo) throw new ActionError("Demo agents can’t be removed.");
    // Their tickets fall back to the unassigned queue (agent_id is set null by the FK).
    await db.delete(users).where(eq(users.id, agent.id));
    revalidatePath("/", "layout");
    redirect("/agents");
  });
}

// ----- Own profile -----

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor();
    const parsed = z
      .object({ name, email, company: z.string().trim().max(80).optional() })
      .safeParse({ ...Object.fromEntries(form), company: form.get("company") ?? undefined });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    if (user.isDemo && parsed.data.email !== user.email) throw new ActionError("The demo account’s email can’t be changed.");
    if (await emailTaken(parsed.data.email, user.id)) return { error: "That email is already in use" };

    await db
      .update(users)
      .set({ name: parsed.data.name, email: parsed.data.email, ...(user.role === "customer" ? { company: parsed.data.company || null } : {}) })
      .where(eq(users.id, user.id));
    await startSession({ userId: user.id, role: user.role, name: parsed.data.name }); // refresh the name in the session
    revalidatePath("/", "layout");
    return { ok: "Profile saved" };
  });
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor();
    if (user.isDemo) throw new ActionError("The demo account’s password can’t be changed.");
    const parsed = z
      .object({ current: z.string().min(1, "Enter your current password"), password: z.string().min(8, "Use at least 8 characters").max(200) })
      .safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) return { error: "Your current password is incorrect" };

    await db.update(users).set({ passwordHash: await bcrypt.hash(parsed.data.password, 10) }).where(eq(users.id, user.id));
    return { ok: "Password updated" };
  });
}

// ----- Notifications -----

export async function markAllRead(_: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor();
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    revalidatePath("/", "layout");
    return { ok: "All caught up" };
  });
}
