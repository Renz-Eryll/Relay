import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["customer", "agent", "admin"]);
export const statusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);
export const priorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "urgent"]);
export const eventEnum = pgEnum("ticket_event", ["created", "status", "priority", "assigned", "unassigned"]);

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_ticket_idx").on(t.ticketId, t.createdAt)],
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
