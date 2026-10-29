import type { Metadata } from "next";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import AuthShell from "@/components/AuthShell";
import DemoButtons from "@/components/DemoButtons";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; error?: string; expired?: string }> }) {
  const { reset, error, expired } = await searchParams;
  return (
    <AuthShell>
      <h1 className="display text-[28px] leading-tight">Sign in</h1>
      <p className="mt-1.5 text-muted">Welcome back to Relay.</p>
      {expired && <p className="mt-4 rounded-[6px] border border-line bg-sunken px-3 py-2 text-[13px] text-muted">Your session ended (the demo resets every day). Sign in again or pick a demo role below.</p>}
      {reset && <p className="mt-4 rounded-[6px] bg-ok-soft px-3 py-2 text-[13px] text-ok">Password updated. Sign in with your new password.</p>}

      <ActionForm action={login} className="mt-7 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="name@company.com" required className="field" />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label className="label mb-0" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="text-[12px] font-medium text-brand-ink hover:underline">
              Forgot password?
            </Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
        </div>
        <SubmitButton className="btn-primary h-10 w-full" pending="Signing in…">
          Sign in
        </SubmitButton>
      </ActionForm>

      <p className="mt-5 text-center text-[13px] text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand-ink hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-7 border-t border-dashed border-line-strong pt-5">
        <p className="mb-3 text-[13px] text-muted">Or explore the demo as:</p>
        <DemoButtons />
        {error === "demo" && <p className="mt-2 text-sm text-danger">The demo isn’t available right now.</p>}
      </div>
    </AuthShell>
  );
}
