import { after, NextResponse, type NextRequest } from "next/server";
import { triageWaitingTickets } from "@/lib/ai/run-triage";
import { seedDemo } from "@/lib/demo";

// Daily Vercel Cron (see vercel.json): restores the shared demo workspace.
// Vercel sends `Authorization: Bearer $CRON_SECRET`.
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const result = await seedDemo();
  // Relay AI triages the fresh open tickets after responding, so the cron call returns quickly.
  after(() => triageWaitingTickets());
  return NextResponse.json({ ok: true, ...result });
}
