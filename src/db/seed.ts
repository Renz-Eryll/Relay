// Seeds (or resets) the demo workspace. Usage: npm run db:seed  (reads DATABASE_URL from .env.local)
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { seedDemo } = await import("../lib/demo");
  const result = await seedDemo();
  console.log(`Demo workspace ready: ${result.tickets} tickets, ${result.staff} staff, ${result.customers} customers`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
