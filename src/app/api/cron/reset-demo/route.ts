import { NextResponse, type NextRequest } from "next/server";
import { seedDemo } from "@/lib/demo";

// Daily Vercel Cron (see vercel.json): restores the shared demo workspace.
// Vercel sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await seedDemo()) });
}
