import type { Metadata } from "next";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";
import AuthShell from "@/components/AuthShell";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Enter your code" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <AuthShell>
      <h1 className="display text-[28px] leading-tight">Check your email</h1>
      <p className="mt-1.5 text-muted">
        If an account exists for <span className="font-medium text-ink">{email || "that email"}</span>, we sent a 6-digit code. It expires in 10 minutes.
      </p>
      <ActionForm action={resetPassword} className="mt-7 space-y-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <label className="label" htmlFor="code">
            Code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="000000"
            className="field num text-center text-[20px] tracking-[0.5em]"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            New password
          </label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field" />
        </div>
        <SubmitButton className="btn-primary h-10 w-full" pending="Updating…">
          Update password
        </SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-[13px] text-muted">
        Didn’t get it?{" "}
        <Link href="/forgot-password" className="font-medium text-brand-ink hover:underline">
          Send a new code
        </Link>
      </p>
    </AuthShell>
  );
}
