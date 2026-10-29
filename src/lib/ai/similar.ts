// Ticket embeddings (pgvector) and "similar resolved tickets" for AI reply drafts.
// Relative imports and no "server-only": the demo seed embeds its tickets through tsx.
import { embedMany } from "ai";
import { and, asc, cosineDistance, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { messages, ticketEmbeddings, tickets, users } from "../../db/schema";
import { logged } from "./logged";
import { aiEnabled, EMBEDDING_MODEL, embeddingModel, embeddingOptions } from "./provider";

// Below this cosine similarity a resolved ticket isn't close enough to be worth citing. Measured on the demo
// tickets: unrelated pairs scored 0.58-0.63 and related ones 0.67-0.71 (default task type; SEMANTIC_SIMILARITY
// compressed everything into 0.76-0.82 and separated them less).
export const MIN_SIMILARITY = 0.65;

const textOf = (t: { subject: string; description: string }) => `${t.subject}\n\n${t.description}`;

// Embed tickets in one call and store (or replace) their vectors.
export async function embedTickets(rows: { id: number; subject: string; description: string }[]) {
  if (!aiEnabled() || !rows.length) return 0;
  const vectors = await logged({ feature: "embed", model: EMBEDDING_MODEL, ticketId: rows.length === 1 ? rows[0].id : null }, async () => {
    const r = await embedMany({ model: embeddingModel(), values: rows.map(textOf), providerOptions: embeddingOptions });
    return { value: r.embeddings, usage: { inputTokens: r.usage.tokens } };
  });
  await db
    .insert(ticketEmbeddings)
    .values(rows.map((t, i) => ({ ticketId: t.id, embedding: vectors[i], updatedAt: new Date() })))
    .onConflictDoUpdate({ target: ticketEmbeddings.ticketId, set: { embedding: sql`excluded.embedding`, updatedAt: new Date() } });
  return rows.length;
}

export async function embedTicket(ticketId: number) {
  const [t] = await db.select({ id: tickets.id, subject: tickets.subject, description: tickets.description }).from(tickets).where(eq(tickets.id, ticketId));
  if (t) await embedTickets([t]);
}

// Tickets with no vector yet (older tickets, or ones created while AI was off).
export async function embedMissing(limit = 100) {
  const rows = await db
    .select({ id: tickets.id, subject: tickets.subject, description: tickets.description })
    .from(tickets)
    .leftJoin(ticketEmbeddings, eq(ticketEmbeddings.ticketId, tickets.id))
    .where(isNull(ticketEmbeddings.ticketId))
    .limit(limit);
  return embedTickets(rows);
}

export type SimilarTicket = { id: number; subject: string; similarity: number; staffReplies: string[] };

// The resolved or closed tickets in the same category closest to this one, with their staff replies.
export async function findSimilarResolved(ticketId: number, k = 3): Promise<SimilarTicket[]> {
  const [ticket] = await db.select({ categoryId: tickets.categoryId }).from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) return [];
  let [own] = await db.select({ embedding: ticketEmbeddings.embedding }).from(ticketEmbeddings).where(eq(ticketEmbeddings.ticketId, ticketId));
  if (!own) {
    await embedTicket(ticketId);
    [own] = await db.select({ embedding: ticketEmbeddings.embedding }).from(ticketEmbeddings).where(eq(ticketEmbeddings.ticketId, ticketId));
    if (!own) return [];
  }

  const distance = cosineDistance(ticketEmbeddings.embedding, own.embedding);
  const nearest = await db
    .select({ id: tickets.id, subject: tickets.subject, distance: sql<number>`${distance}`.mapWith(Number) })
    .from(ticketEmbeddings)
    .innerJoin(tickets, eq(ticketEmbeddings.ticketId, tickets.id))
    .where(and(ne(tickets.id, ticketId), eq(tickets.categoryId, ticket.categoryId), inArray(tickets.status, ["resolved", "closed"])))
    .orderBy(asc(distance))
    .limit(k);
  const close = nearest.map((n) => ({ ...n, similarity: 1 - n.distance })).filter((n) => n.similarity >= MIN_SIMILARITY);
  if (!close.length) return [];

  // Only staff replies are used: they hold the fix, and they keep other customers' details out of the prompt.
  const replies = await db
    .select({ ticketId: messages.ticketId, body: messages.body })
    .from(messages)
    .innerJoin(users, eq(messages.authorId, users.id))
    .where(and(inArray(messages.ticketId, close.map((c) => c.id)), ne(users.role, "customer")))
    .orderBy(asc(messages.createdAt));
  return close
    .map((c) => ({ id: c.id, subject: c.subject, similarity: c.similarity, staffReplies: replies.filter((r) => r.ticketId === c.id).map((r) => r.body) }))
    .filter((c) => c.staffReplies.length > 0);
}
