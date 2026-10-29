import { boolean, index, integer, pgEnum, pgTable, real, serial, text, timestamp, uniqueIndex, uuid, vector } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["customer", "agent", "admin"]);
export const statusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);
export const priorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "urgent"]);
export const eventEnum = pgEnum("ticket_event", ["created", "status", "priority", "assigned", "unassigned", "category"]);
export const triageOutcomeEnum = pgEnum("triage_outcome", ["auto", "review", "accepted", "overridden", "failed"]);
export const aiFeatureEnum = pgEnum("ai_feature", ["triage", "embed", "draft", "summary"]);

// The product areas customers raise tickets about; agents specialise in one.
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("customer"),
    company: text("company"),
    // Agents handle tickets in one category.
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    // Shared demo accounts can't change their email or password.
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), index("users_role_idx").on(t.role)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    priority: priorityEnum("priority").notNull().default("medium"),
    status: statusEnum("status").notNull().default("open"),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    index("tickets_customer_idx").on(t.customerId),
    index("tickets_agent_idx").on(t.agentId),
    index("tickets_status_idx").on(t.status),
    index("tickets_category_idx").on(t.categoryId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

// Audit log: who changed what on a ticket, and when.
export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: eventEnum("type").notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    // Changes made by Relay AI (auto-triage) rather than a person.
    byAi: boolean("by_ai").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_ticket_idx").on(t.ticketId, t.createdAt)],
);

// One AI triage run per ticket: the prediction, the customer's own pick (the baseline) and what happened next.
export const ticketTriage = pgTable(
  "ticket_triage",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    priority: priorityEnum("priority"),
    confidence: real("confidence"),
    reason: text("reason"),
    customerCategoryId: integer("customer_category_id").references(() => categories.id, { onDelete: "set null" }),
    customerPriority: priorityEnum("customer_priority").notNull(),
    outcome: triageOutcomeEnum("outcome").notNull(),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("triage_ticket_idx").on(t.ticketId), index("triage_outcome_idx").on(t.outcome, t.createdAt)],
);

// Vector of each ticket's subject and description, for finding similar resolved tickets.
export const ticketEmbeddings = pgTable(
  "ticket_embeddings",
  {
    ticketId: integer("ticket_id")
      .primaryKey()
      .references(() => tickets.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("embeddings_hnsw_idx").using("hnsw", t.embedding.op("vector_cosine_ops"))],
);

// Catch-up summaries for an agent picking up a ticket; covers the thread up to a message.
export const ticketSummaries = pgTable(
  "ticket_summaries",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    upToMessageId: integer("up_to_message_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("summaries_ticket_idx").on(t.ticketId, t.createdAt)],
);

// Every AI call: for daily limits on the free tier, and for the dashboard.
export const aiRequests = pgTable(
  "ai_requests",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    feature: aiFeatureEnum("feature").notNull(),
    ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    model: text("model").notNull(),
    ok: boolean("ok").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_requests_day_idx").on(t.createdAt), index("ai_requests_user_idx").on(t.userId, t.feature, t.createdAt)],
);

// One notifications table for every role.
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

// One-time codes for password reset, stored hashed.
export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Role = (typeof roleEnum.enumValues)[number];
export type Status = (typeof statusEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
export type Ticket = typeof tickets.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type AiFeature = (typeof aiFeatureEnum.enumValues)[number];
export type TriageOutcome = (typeof triageOutcomeEnum.enumValues)[number];
