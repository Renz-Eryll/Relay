import { describe, expect, it } from "vitest";
import { fromBody, summaryMessage, toBody } from "./summary";

describe("summary storage", () => {
  const summary = { problem: "Counter 3 printer goes offline after a few sales.", tried: "Asked for the printer model; customer said USB thermal.", next: "Have them update the driver from Settings → Devices." };

  it("round-trips the three labelled lines", () => {
    expect(fromBody(toBody(summary))).toEqual([
      { label: "Problem", text: summary.problem },
      { label: "Tried", text: summary.tried },
      { label: "Next", text: summary.next },
    ]);
  });

  it("ignores lines that aren't one of the three labels", () => {
    expect(fromBody("Problem: A\nsomething else\nNext: B")).toEqual([
      { label: "Problem", text: "A" },
      { label: "Next", text: "B" },
    ]);
  });
});

describe("summaryMessage", () => {
  it("gives the model the ticket and the conversation, marking who is staff", () => {
    const msg = summaryMessage({
      subject: "Printer offline",
      description: "Counter 3 printer goes offline.",
      thread: [{ author: "Miguel Santos", staff: true, body: "Which model?" }],
    });
    expect(msg).toContain("Subject: Printer offline");
    expect(msg).toContain("Agent (Miguel Santos): Which model?");
  });
});
