"use server";

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { endSession, startSession, type ActionState } from "@/lib/auth";
import { DEMO_EMAILS } from "@/lib/demo";
import { sendMail } from "@/lib/mail";
import { HOME, type Role } from "@/lib/session";

// Compared against when the email doesn't exist, so timing doesn't reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);
const email = z.string().trim().toLowerCase().email("Enter a valid email");
const password = z.string().min(8, "Use at least 8 characters").max(200);

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password") }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email));
  const valid = (await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH)) && user && !user.isDemo;
  if (!valid) return { error: "Incorrect email or password" };

  await startSession({ userId: user.id, role: user.role, name: user.name });
  redirect(HOME[user.role]);
}

export async function signup(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter your name").max(80),
      company: z.string().trim().max(80).optional(),
      email,
      password,
      terms: z.literal("on", { message: "Accept the terms to continue" }),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email));
  if (taken) return { error: "An account with this email already exists" };

  const [user] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: "customer",
    })
    .returning();
  await startSession({ userId: user.id, role: "customer", name: user.name });
  redirect("/tickets/new?welcome=1");
}

export async function demoLogin(role: Role) {
  const [user] = await db.select().from(users).where(eq(users.email, DEMO_EMAILS[role]));
  if (!user) redirect("/login?error=demo");
  await startSession({ userId: user.id, role: user.role, name: user.name });
  redirect(HOME[user.role]);
}

export async function logout() {
  await endSession();
  redirect("/login");
}

// ----- Password reset with a 6-digit code -----

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 3;

const hashCode = (code: string) => createHmac("sha256", process.env.AUTH_SECRET!).update(code).digest("hex");

export async function requestReset(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "Enter a valid email" };

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data));
  // Same response whether or not the account exists.
  if (user && !user.isDemo) {
    const [{ recent }] = await db
      .select({ recent: count() })
      .from(passwordResets)
      .where(and(eq(passwordResets.userId, user.id), gt(passwordResets.createdAt, new Date(Date.now() - 3_600_000))));
    if (recent < MAX_CODES_PER_HOUR) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      await db.insert(passwordResets).values({ userId: user.id, codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) });
      await sendMail(user.email, "Your Relay reset code", `Your password reset code is ${code}. It expires in 10 minutes.\n\nIf you didn't ask for this, you can ignore this email.`);
    }
  }
  redirect(`/forgot-password/reset?email=${encodeURIComponent(parsed.data)}`);
}

export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z
    .object({ email, code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"), password })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const invalid = { error: "That code is invalid or has expired. Request a new one." };
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email));
  if (!user || user.isDemo) return invalid;

  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
    .orderBy(desc(passwordResets.createdAt))
    .limit(1);
  if (!reset || reset.attempts >= MAX_ATTEMPTS) return invalid;

  const matches = timingSafeEqual(Buffer.from(hashCode(parsed.data.code)), Buffer.from(reset.codeHash));
  if (!matches) {
    await db.update(passwordResets).set({ attempts: reset.attempts + 1 }).where(eq(passwordResets.id, reset.id));
    return invalid;
  }

  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));
  await db.update(users).set({ passwordHash: await bcrypt.hash(parsed.data.password, 10) }).where(eq(users.id, user.id));
  redirect("/login?reset=1");
}
