import type { Metadata } from "next";
import { changePassword, updateProfile } from "@/app/actions/people";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Your profile and password." />
      {user.isDemo && (
        <p className="mb-6 rounded-[6px] border border-line bg-sunken px-4 py-3 text-[13px] text-muted">
          This is a shared demo account, so its email and password can’t be changed. You can still edit the name.
        </p>
      )}

      <section className="card p-5">
        <h2 className="text-[15px] font-semibold">Profile</h2>
        <ActionForm action={updateProfile} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input id="name" name="name" defaultValue={user.name} required minLength={2} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" defaultValue={user.email} required readOnly={user.isDemo} className="field read-only:bg-sunken" />
            </div>
          </div>
          {user.role === "customer" && (
            <div>
              <label className="label" htmlFor="company">
                Company <span className="font-normal text-faint">(optional)</span>
              </label>
              <input id="company" name="company" defaultValue={user.company ?? ""} maxLength={80} className="field" />
            </div>
          )}
          <SubmitButton>Save profile</SubmitButton>
        </ActionForm>
      </section>

      {!user.isDemo && (
        <section className="card mt-6 p-5">
          <h2 className="text-[15px] font-semibold">Password</h2>
          <ActionForm action={changePassword} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="current">
                  Current password
                </label>
                <input id="current" name="current" type="password" autoComplete="current-password" required className="field" />
              </div>
              <div>
                <label className="label" htmlFor="password">
                  New password
                </label>
                <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field" />
              </div>
            </div>
            <SubmitButton>Update password</SubmitButton>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
