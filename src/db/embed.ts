// Backfill embeddings for tickets that don't have one (created before Relay AI, or while it was off).
// Usage: npm run ai:embed  (reads DATABASE_URL and GEMINI_API_KEY from .env.local)
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

async function main() {
  const { embedMissing } = await import("../lib/ai/similar");
  let total = 0;
  for (let n = await embedMissing(); n > 0; n = await embedMissing()) total += n;
  console.log(`Embedded ${total} tickets.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
