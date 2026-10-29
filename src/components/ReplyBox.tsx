"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { draftReply, type DraftSource } from "@/app/actions/ai";
import { ticketRef } from "@/lib/labels";
import { Icon } from "./Nav";

// The reply textarea, plus "Draft with AI" for staff. The draft only fills the box; the agent edits and sends it.
export function ReplyBox({ ticketId, placeholder, canDraft, linkSources }: { ticketId: number; placeholder: string; canDraft: boolean; linkSources: boolean }) {
  const box = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<DraftSource[] | null>(null);

  const draft = () =>
    start(async () => {
      setError(null);
      const result = await draftReply(ticketId);
      if ("error" in result) return setError(result.error);
      if (box.current) {
        box.current.value = result.reply;
        box.current.focus();
      }
      setSources(result.sources);
    });

  return (
    <div className="space-y-3">
      <label htmlFor="body" className="sr-only">
        Reply
      </label>
      <textarea
        ref={box}
        id="body"
        name="body"
        rows={pending ? 4 : 5}
        required
        maxLength={5000}
        placeholder={pending ? "Relay AI is drafting a reply…" : placeholder}
        disabled={pending}
        className="field h-auto resize-y py-2.5 disabled:opacity-60"
      />

      {sources !== null && (
        <div className="perf rounded-[6px] border px-3 py-2.5 text-[12px] text-muted">
          <p className="flex items-center gap-1.5 font-medium text-ink">
            <Icon name="ai" className="size-3.5 text-brand-ink" />
            {sources.length ? "Drafted from these resolved tickets. Check it before sending." : "No similar resolved tickets, so this draft asks for details. Check it before sending."}
          </p>
          {sources.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {sources.map((s) =>
                linkSources ? (
                  <li key={s.id}>
                    <Link href={`/tickets/${s.id}`} className="hover:text-ink hover:underline" target="_blank">
                      <span className="num text-brand-ink">{ticketRef(s.id)}</span> {s.subject}
                    </Link>{" "}
                    <span className="num text-faint">· {Math.round(s.similarity * 100)}% similar</span>
                  </li>
                ) : (
                  <li key={s.id}>
                    <details>
                      <summary className="cursor-pointer hover:text-ink">
                        <span className="num text-brand-ink">{ticketRef(s.id)}</span> {s.subject} <span className="num text-faint">· {Math.round(s.similarity * 100)}% similar</span>
                      </summary>
                      <p className="mt-1 border-l-2 border-line-strong pl-2.5">“{s.snippet}”</p>
                    </details>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      )}
      {error && <p className="text-[13px] text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {canDraft ? (
          <button type="button" onClick={draft} disabled={pending} className="btn-outline">
            <Icon name="ai" className="size-4 text-brand-ink" />
            {pending ? "Drafting…" : "Draft with AI"}
          </button>
        ) : (
          <span />
        )}
        <SendButton />
      </div>
    </div>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Sending…" : "Send reply"}
    </button>
  );
}
