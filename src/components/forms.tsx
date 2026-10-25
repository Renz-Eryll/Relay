"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/auth";

export function SubmitButton({ children, pending: pendingLabel, className = "btn-primary" }: { children: ReactNode; pending?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-[6px] border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
        {state.error}
      </p>
    );
  }
  if (state?.ok) return <p className="text-[13px] font-medium text-ok">{state.ok}</p>;
  return null;
}

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

// A form bound to a server action, with its error/success message.
export function ActionForm({ action, children, className = "space-y-4" }: { action: Action; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

// A one-button form (delete, mark read) that asks before running.
export function ConfirmButton({
  action,
  children,
  confirm,
  className = "btn-ghost",
}: {
  action: (state: ActionState) => Promise<ActionState>;
  children: ReactNode;
  confirm?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col items-start gap-2"
    >
      <SubmitButton className={className} pending="Working…">
        {children}
      </SubmitButton>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
