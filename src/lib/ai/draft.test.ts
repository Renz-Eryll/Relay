import { describe, expect, it } from "vitest";
import { draftMessage, draftPrompt } from "./draft";

const sources = [
  { id: 101, subject: "Receipt printer stops after 5 receipts", similarity: 0.71, staffReplies: ["Please update the printer driver from Settings → Devices."] },
];

describe("draftPrompt", () => {
  it("gives the model each source's id, subject and staff replies", () => {
    const prompt = draftPrompt(sources);
    expect(prompt).toContain("[101] Receipt printer stops after 5 receipts");
    expect(prompt).toContain("How it was resolved: Please update the printer driver");
  });

  it("tells the model not to invent a fix when nothing similar was found", () => {
    const prompt = draftPrompt([]);
    expect(prompt).toContain("No similar resolved tickets were found.");
    expect(prompt).toMatch(/don't invent a fix/);
  });
});

describe("draftMessage", () => {
  it("includes the ticket and the thread so far, marking who is staff", () => {
    const msg = draftMessage({
      subject: "Printer offline",
      description: "Counter 3 printer goes offline.",
      customerFirstName: "Ramon",
      agentName: "Miguel Santos",
      thread: [
        { author: "Miguel Santos", staff: true, body: "Which model is it?" },
        { author: "Ramon Dela Cruz", staff: false, body: "USB thermal." },
      ],
    });
    expect(msg).toContain("Customer: Ramon. Agent writing the reply: Miguel Santos.");
    expect(msg).toContain("Agent (Miguel Santos): Which model is it?");
    expect(msg).toContain("Customer (Ramon Dela Cruz): USB thermal.");
  });
});
