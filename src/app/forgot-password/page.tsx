import type { Metadata } from "next";
import Link from "next/link";
import { requestReset } from "@/app/actions/auth";
import AuthShell from "@/components/AuthShell";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <h1 className="display text-[28px] leading-tight">Reset your password</h1>
      <p className="mt-1.5 text-muted">Enter your email and we’ll send you a 6-digit code.</p>
      <ActionForm action={requestReset} className="mt-7 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" />
        </div>
        <SubmitButton className="btn-primary h-10 w-full" pending="Sending…">
          Send code
        </SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-[13px] text-muted">
        <Link href="/login" className="font-medium text-brand-ink hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
