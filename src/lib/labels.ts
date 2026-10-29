import type { Priority, Status } from "@/db/schema";

export const STATUS: Record<Status, { label: string; tone: string }> = {
  open: { label: "Open", tone: "bg-sky-soft text-sky" },
  in_progress: { label: "In progress", tone: "bg-amber-soft text-amber" },
  resolved: { label: "Resolved", tone: "bg-ok-soft text-ok" },
  closed: { label: "Closed", tone: "bg-sunken text-muted" },
};

export const PRIORITY: Record<Priority, { label: string; tone: string; rank: number }> = {
  low: { label: "Low", tone: "text-muted", rank: 0 },
  medium: { label: "Medium", tone: "text-ink", rank: 1 },
  high: { label: "High", tone: "text-amber", rank: 2 },
  urgent: { label: "Urgent", tone: "text-danger", rank: 3 },
};

// What each priority means. Shown on the new-ticket form and given to Relay AI as its rubric.
export const PRIORITY_HINT: Record<Priority, string> = {
  low: "Question or small request",
  medium: "Something isn’t working right",
  high: "Blocking part of our work",
  urgent: "We can’t operate",
};

export const STATUSES = Object.keys(STATUS) as Status[];
export const PRIORITIES = Object.keys(PRIORITY) as Priority[];

export const ticketRef = (id: number) => `#${String(id).padStart(4, "0")}`;
