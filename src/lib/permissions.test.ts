import { describe, expect, it } from "vitest";
import { allowedStatuses, canClaim, canReply, canView, canWork } from "./permissions";

const customer = { id: "c1", role: "customer" as const, categoryId: null };
const otherCustomer = { id: "c2", role: "customer" as const, categoryId: null };
const agent = { id: "a1", role: "agent" as const, categoryId: 1 };
const otherAgent = { id: "a2", role: "agent" as const, categoryId: 2 };
const admin = { id: "x1", role: "admin" as const, categoryId: null };

const ticket = (over: Partial<{ agentId: string | null; categoryId: number; status: "open" | "in_progress" | "resolved" | "closed" }> = {}) => ({
  customerId: "c1",
  agentId: null,
  categoryId: 1,
  status: "open" as const,
  ...over,
});

describe("canView", () => {
  it("lets customers see only their own tickets", () => {
    expect(canView(customer, ticket())).toBe(true);
    expect(canView(otherCustomer, ticket())).toBe(false);
  });

  it("lets agents see unassigned tickets in their category and tickets assigned to them", () => {
    expect(canView(agent, ticket())).toBe(true);
    expect(canView(otherAgent, ticket())).toBe(false);
    expect(canView(otherAgent, ticket({ agentId: "a2" }))).toBe(true);
    expect(canView(agent, ticket({ agentId: "a2" }))).toBe(false);
  });

  it("lets admins see everything", () => {
    expect(canView(admin, ticket({ agentId: "a2", categoryId: 5 }))).toBe(true);
  });
});

describe("working a ticket", () => {
  it("only lets an agent claim unassigned tickets in their category", () => {
    expect(canClaim(agent, ticket())).toBe(true);
    expect(canClaim(agent, ticket({ agentId: "a2" }))).toBe(false);
    expect(canClaim(otherAgent, ticket())).toBe(false);
  });

  it("only lets the assigned agent or an admin work it", () => {
    expect(canWork(agent, ticket())).toBe(false);
    expect(canWork(agent, ticket({ agentId: "a1" }))).toBe(true);
    expect(canWork(admin, ticket())).toBe(true);
  });

  it("makes closed tickets read-only", () => {
    expect(canReply(customer, ticket({ status: "closed" }))).toBe(false);
    expect(canReply(customer, ticket({ status: "resolved" }))).toBe(true);
  });
});

describe("allowedStatuses", () => {
  it("lets customers close an open ticket or reopen a finished one", () => {
    expect(allowedStatuses(customer, ticket())).toEqual(["closed"]);
    expect(allowedStatuses(customer, ticket({ status: "resolved" }))).toEqual(["open"]);
  });

  it("gives staff working the ticket every other status", () => {
    expect(allowedStatuses(admin, ticket({ status: "in_progress" }))).toEqual(["open", "resolved", "closed"]);
  });

  it("gives everyone else nothing", () => {
    expect(allowedStatuses(otherCustomer, ticket())).toEqual([]);
  });
});
