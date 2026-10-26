import type { Metadata } from "next";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import AuthShell from "@/components/AuthShell";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <AuthShell>
      <h1 className="display text-[28px] leading-tight">Create an account</h1>
      <p className="mt-1.5 text-muted">Raise tickets and follow every reply.</p>

      <ActionForm action={signup} className="mt-7 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" name="name" autoComplete="name" required minLength={2} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="company">
              Company <span className="font-normal text-faint">(optional)</span>
            </label>
            <input id="company" name="company" autoComplete="organization" className="field" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field" />
          <p className="mt-1.5 text-xs text-faint">At least 8 characters</p>
        </div>
        <label className="flex items-start gap-2 text-[13px] text-muted">
          <input type="checkbox" name="terms" required className="mt-0.5 accent-[var(--color-brand)]" />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-ink underline underline-offset-2">
              terms
            </Link>
          </span>
        </label>
        <SubmitButton className="btn-primary h-10 w-full" pending="Creating account…">
          Create account
        </SubmitButton>
      </ActionForm>

      <p className="mt-5 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-ink hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
