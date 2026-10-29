// Demo workspace: shared accounts plus realistic tickets. Used by the seed script
// and the nightly reset cron. Relative imports so `tsx` can run it directly.
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { CATEGORIES } from "./catalog";
import { categories, messages, notifications, ticketEvents, tickets, users, type Priority, type Status } from "../db/schema";

export const DEMO_EMAILS = {
  customer: "customer@relay.demo",
  agent: "agent@relay.demo",
  admin: "admin@relay.demo",
} as const;


const STAFF = [
  { name: "Dana Cruz", email: DEMO_EMAILS.admin, role: "admin" as const, category: null },
  { name: "Miguel Santos", email: DEMO_EMAILS.agent, role: "agent" as const, category: "pos" },
  { name: "Ana Reyes", email: "ana.reyes@relay.demo", role: "agent" as const, category: "inventory" },
  { name: "Paolo Lim", email: "paolo.lim@relay.demo", role: "agent" as const, category: "accounting" },
  { name: "Bea Villanueva", email: "bea.villanueva@relay.demo", role: "agent" as const, category: "billing" },
  { name: "Carlo Mendoza", email: "carlo.mendoza@relay.demo", role: "agent" as const, category: "payroll" },
];

const CUSTOMERS = [
  { name: "Ramon Dela Cruz", email: DEMO_EMAILS.customer, company: "Sari-Sari Mart" },
  { name: "Lucia Tan", email: "lucia.tan@relay.demo", company: "Tan Hardware" },
  { name: "Jose Aquino", email: "jose.aquino@relay.demo", company: "Aquino Water District" },
  { name: "Mae Garcia", email: "mae.garcia@relay.demo", company: "Garcia Bakeshop" },
  { name: "Nico Bautista", email: "nico.bautista@relay.demo", company: "Bautista Logistics" },
];

type Template = { category: string; subject: string; description: string; replies: [who: "customer" | "agent", body: string][] };

const TEMPLATES: Template[] = [
  { category: "pos", subject: "Receipt printer stops after every 5 transactions", description: "Our front counter terminal prints the first few receipts fine, then the printer goes offline and we have to restart the POS app.", replies: [["agent", "Thanks Ramon. Which printer model is it, and is it connected by USB or LAN?"], ["customer", "It's the USB thermal printer that came with the kit."], ["agent", "Please update the printer driver from Settings → Devices. I've also pushed a fix that keeps the print queue alive."]] },
  { category: "pos", subject: "Cashier can't apply the senior citizen discount", description: "When our cashier selects the senior/PWD discount the total doesn't change. It started after yesterday's update.", replies: [["agent", "I can reproduce this. The discount rule lost its VAT exemption flag in the update. Fixing it now."]] },
  { category: "pos", subject: "Add a new cashier account for our second branch", description: "We opened a second branch and need two new cashier logins with access to that branch only.", replies: [] },
  { category: "pos", subject: "Promo price not showing on the shelf labels export", description: "The promo prices we set for the weekend sale appear at checkout but the shelf label export still shows the regular price.", replies: [["agent", "The label export reads the base price list. I'll add the active promo price as a column."], ["customer", "Great, thank you!"]] },
  { category: "inventory", subject: "Stock count doesn't match after branch transfer", description: "We transferred 40 cases of bottled water from the warehouse to Branch 2. The warehouse went down by 40 but Branch 2 only shows 20.", replies: [["agent", "The transfer was split into two shipments and the second one is still 'in transit'. Can someone at Branch 2 confirm receipt?"], ["customer", "Confirmed, both shipments arrived."], ["agent", "Done. Branch 2 now shows 40 cases."]] },
  { category: "inventory", subject: "Low-stock alerts are sent too late", description: "We only get the low-stock email when an item is already at zero. Can we set the alert threshold per item?", replies: [] },
  { category: "inventory", subject: "Barcode scanner adds items twice", description: "Scanning an item during receiving sometimes adds it twice to the delivery.", replies: [["agent", "Is the scanner set to send an Enter key after each scan? A double suffix causes this."]] },
  { category: "inventory", subject: "Import supplier price list from Excel", description: "Our supplier sends a new price list every month in Excel. Is there a way to import it instead of typing each item?", replies: [["agent", "Yes. Use Inventory → Import and pick the 'Supplier prices' template. I've attached the column guide in your account."], ["customer", "Worked perfectly, thanks Ana."]] },
  { category: "accounting", subject: "Bank reconciliation shows duplicate deposits", description: "Our October bank reconciliation lists several deposits twice, so the balance is off.", replies: [["agent", "The bank file was imported twice on Oct 3. I've removed the duplicate batch, so please re-run the reconciliation."]] },
  { category: "accounting", subject: "Need the BIR 2550Q report for Q3", description: "Where can we generate the quarterly VAT return report? The menu item seems to be missing for our role.", replies: [["agent", "Your role is missing the Tax Reports permission. I've added it for you."], ["customer", "I can see it now."]] },
  { category: "accounting", subject: "Invoice numbering restarted at 1", description: "After the year-end close our sales invoice series started again at 0001. We need it to continue from the last number.", replies: [] },
  { category: "accounting", subject: "Export general ledger to CSV", description: "Our auditor needs the full general ledger for the fiscal year as a CSV file.", replies: [["agent", "You can export it from Reports → General Ledger → Export. For a full year, use the date range filter first."]] },
  { category: "billing", subject: "Meter readings uploaded twice for Zone 4", description: "Our meter readers synced their handheld devices and Zone 4 readings were uploaded twice, so customers got double consumption.", replies: [["agent", "I've rolled back the second upload for Zone 4. Bills for that zone are being regenerated."], ["customer", "Thank you. Can you tell us how many accounts were affected?"], ["agent", "312 accounts. None of the bills had been sent yet."]] },
  { category: "billing", subject: "Payments from the bank not posting", description: "Payments made through our partner bank since yesterday are not reflected on customer accounts.", replies: [["agent", "The bank changed their file format. I've updated the parser and re-posted yesterday's payments."]] },
  { category: "billing", subject: "Senior discount on water bills", description: "We need to apply the 5% senior citizen discount for qualified residential accounts automatically.", replies: [] },
  { category: "billing", subject: "Disconnection notice template", description: "Can we customize the wording and logo on the disconnection notice we print for overdue accounts?", replies: [["agent", "Yes, under Billing → Templates. I can set it up if you send the wording."]] },
  { category: "payroll", subject: "SSS contribution table not updated", description: "Payroll for the first cutoff used the old SSS contribution table. The new rates took effect this month.", replies: [["agent", "The new table is now active. I'll re-run the computation for the first cutoff so you can review it before release."], ["customer", "Reviewed and released. Thanks Carlo."]] },
  { category: "payroll", subject: "Employee can't see their payslip", description: "One of our staff gets an error when opening their payslip on the employee portal.", replies: [["agent", "Their employee profile had no portal account linked. I've linked it, so they can log in again now."]] },
  { category: "payroll", subject: "Overtime not computed for holiday work", description: "Staff who worked on the regular holiday didn't get the holiday overtime rate.", replies: [] },
  { category: "payroll", subject: "Leave balance reset request", description: "Please reset vacation leave balances for the new year based on our policy of 15 days.", replies: [["agent", "Done. All regular employees now have 15 days, carried over balances excluded per your policy."]] },
  { category: "pos", subject: "Card terminal shows 'host unreachable'", description: "Card payments fail with 'host unreachable' since this morning. Cash is fine.", replies: [["agent", "The payment gateway had an outage this morning. It's back up. Can you try a test transaction?"]] },
  { category: "inventory", subject: "Expiry date tracking for baked goods", description: "We'd like to track expiry dates for our baked goods so we know what to pull from the shelves.", replies: [] },
  { category: "accounting", subject: "Petty cash replenishment entry", description: "How should we record petty cash replenishment so it doesn't double count the expenses?", replies: [["agent", "Record the expenses when they happen, and the replenishment as a transfer from cash in bank to petty cash. I've shared an example entry."]] },
  { category: "billing", subject: "SMS bill reminders not sending", description: "Customers stopped getting the SMS reminder 3 days before the due date.", replies: [] },
  { category: "payroll", subject: "13th month pay computation", description: "Can we preview the 13th month pay before December so we can budget for it?", replies: [["agent", "Yes, go to Payroll → 13th Month → Preview. It uses actual basic pay to date plus projections for the remaining months."]] },
  { category: "pos", subject: "End-of-day report totals look wrong", description: "The end-of-day report shows a higher cash total than what's in the drawer.", replies: [] },
];

// Roughly: older tickets are resolved/closed, recent ones are open or in progress.
const OUTCOMES: { status: Status; assigned: boolean }[] = [
  { status: "closed", assigned: true },
  { status: "resolved", assigned: true },
  { status: "in_progress", assigned: true },
  { status: "open", assigned: false },
];
const PRIORITY_CYCLE: Priority[] = ["medium", "high", "low", "urgent", "medium", "high"];

const HOUR = 3_600_000;

export async function seedDemo() {
  // Categories are upserted by slug so real tickets that use them survive a reset.
  for (const c of CATEGORIES) {
    await db.insert(categories).values(c).onConflictDoUpdate({ target: categories.slug, set: { name: c.name, description: c.description } });
  }
  const cats = await db.select().from(categories);
  const catId = (slug: string) => cats.find((c) => c.slug === slug)!.id;

  // Remove previous demo accounts; their tickets, messages and notifications cascade.
  const demoEmails = [...STAFF, ...CUSTOMERS].map((u) => u.email);
  await db.delete(users).where(inArray(users.email, demoEmails));

  const unusable = await bcrypt.hash(randomBytes(24).toString("hex"), 10); // demo accounts enter via the demo buttons
  const staff = await db
    .insert(users)
    .values(STAFF.map((s) => ({ name: s.name, email: s.email, role: s.role, categoryId: s.category ? catId(s.category) : null, isDemo: true, passwordHash: unusable, createdAt: new Date(Date.now() - 120 * 24 * HOUR) })))
    .returning();
  const customers = await db
    .insert(users)
    .values(CUSTOMERS.map((c) => ({ ...c, role: "customer" as const, isDemo: true, passwordHash: unusable, createdAt: new Date(Date.now() - 90 * 24 * HOUR) })))
    .returning();
  const agentFor = (slug: string) => staff.find((s) => s.categoryId === catId(slug) && s.role === "agent")!;
  const admin = staff.find((s) => s.role === "admin")!;

  for (const [i, t] of TEMPLATES.entries()) {
    // The demo customer owns every 3rd ticket; spread the rest.
    const cust = i % 3 === 0 ? customers[0] : customers[1 + (i % (customers.length - 1))];
    const agent = agentFor(t.category);
    // Spread creation over the last ~28 days; newest tickets are the most recent indexes.
    const ageHours = Math.round(((TEMPLATES.length - i) / TEMPLATES.length) * 28 * 24) + (i % 5);
    const createdAt = new Date(Date.now() - ageHours * HOUR);
    const outcome = ageHours > 14 * 24 ? OUTCOMES[i % 2] : ageHours > 4 * 24 ? OUTCOMES[1 + (i % 2)] : OUTCOMES[2 + (i % 2)];
    const hasThread = t.replies.length > 0;
    const status: Status = !hasThread && outcome.status !== "open" ? "open" : outcome.status;
    const assigned = status !== "open" || (hasThread && outcome.assigned);
    // Replies a few hours apart, so tickets resolve within about a day.
    const step = Math.max(1, Math.min(6, Math.floor((ageHours * 0.6) / (t.replies.length + 2))));
    const at = (n: number) => new Date(createdAt.getTime() + n * step * HOUR);
    const resolvedAt = status === "resolved" || status === "closed" ? at(t.replies.length + 1) : null;

    const [ticket] = await db
      .insert(tickets)
      .values({
        subject: t.subject,
        description: t.description,
        categoryId: catId(t.category),
        priority: PRIORITY_CYCLE[i % PRIORITY_CYCLE.length],
        status,
        customerId: cust.id,
        agentId: assigned ? agent.id : null,
        createdAt,
        updatedAt: resolvedAt ?? (hasThread ? at(t.replies.length) : createdAt),
        resolvedAt,
      })
      .returning();

    const events: (typeof ticketEvents.$inferInsert)[] = [{ ticketId: ticket.id, actorId: cust.id, type: "created", createdAt }];
    if (assigned) {
      events.push({ ticketId: ticket.id, actorId: admin.id, type: "assigned", toValue: agent.name, createdAt: at(0.5) });
      events.push({ ticketId: ticket.id, actorId: agent.id, type: "status", fromValue: "open", toValue: "in_progress", createdAt: at(1) });
    }
    if (resolvedAt) events.push({ ticketId: ticket.id, actorId: agent.id, type: "status", fromValue: "in_progress", toValue: "resolved", createdAt: resolvedAt });
    if (status === "closed") events.push({ ticketId: ticket.id, actorId: cust.id, type: "status", fromValue: "resolved", toValue: "closed", createdAt: new Date(resolvedAt!.getTime() + 6 * HOUR) });
    await db.insert(ticketEvents).values(events);

    if (hasThread && assigned) {
      await db.insert(messages).values(
        t.replies.map(([who, body], n) => ({ ticketId: ticket.id, authorId: who === "agent" ? agent.id : cust.id, body, createdAt: at(n + 1) })),
      );
    }

    // A few unread notifications so every role's inbox has something in it.
    if (ageHours < 6 * 24) {
      const note = { ticketId: ticket.id, createdAt: at(1) };
      await db.insert(notifications).values([
        { ...note, userId: admin.id, title: `New ${cats.find((c) => c.id === catId(t.category))!.name} ticket`, body: `${cust.name}: ${t.subject}` },
        ...(assigned ? [{ ...note, userId: agent.id, title: "Ticket assigned to you", body: t.subject }] : []),
        ...(assigned && cust.id === customers[0].id ? [{ ...note, userId: cust.id, title: `${agent.name} is on your ticket`, body: t.subject }] : []),
      ]);
    }
  }

  // Keep the id sequence ahead of the data after deletes.
  await db.execute(sql`select setval(pg_get_serial_sequence('tickets','id'), coalesce(max(id), 1)) from tickets`);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(tickets).where(inArray(tickets.customerId, customers.map((c) => c.id)));
  return { tickets: n, staff: staff.length, customers: customers.length };
}

