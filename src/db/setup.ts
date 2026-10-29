// One-time database setup that `drizzle-kit push` can't do: enable pgvector for ticket embeddings.
// Usage: npm run db:setup  (then npm run db:push). Safe to run again.
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run `vercel env pull .env.local` or see .env.example.");
  await neon(url)`create extension if not exists vector`;
  console.log("pgvector is enabled.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
