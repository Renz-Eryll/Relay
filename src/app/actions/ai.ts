"use server";

import { revalidatePath } from "next/cache";
import { applyTriage, latestTriage, setTriageOutcome } from "@/lib/ai/run-triage";
import { ActionError, actor, runAction, type ActionState } from "@/lib/auth";

const touch = (ticketId: number) => {
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/", "layout");
};

// Admin accepts Relay AI's suggestion for a ticket waiting in review.
export async function acceptTriage(ticketId: number, _: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor("admin");
    const triage = await latestTriage(ticketId);
    if (!triage || (triage.outcome !== "review" && triage.outcome !== "failed")) throw new ActionError("This ticket isn’t waiting for review.");
    if (!triage.categoryId || !triage.priority) throw new ActionError("Relay AI has no suggestion for this ticket. Assign it from the ticket page.");

    await applyTriage(ticketId, { categoryId: triage.categoryId, priority: triage.priority }, { actorId: user.id });
    await setTriageOutcome(ticketId, ["review", "failed"], "accepted");
    touch(ticketId);
    return { ok: "Suggestion applied" };
  });
}

// Admin dismisses the suggestion and will triage the ticket by hand.
export async function dismissTriage(ticketId: number, _: ActionState): Promise<ActionState> {
  return runAction(async () => {
    await actor("admin");
    const triage = await setTriageOutcome(ticketId, ["review", "failed"], "overridden");
    if (!triage) throw new ActionError("This ticket isn’t waiting for review.");
    touch(ticketId);
    return { ok: "Dismissed. Triage it from the ticket page." };
  });
}
