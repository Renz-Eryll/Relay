import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// A signed session whose user no longer exists (the nightly demo reset recreates demo accounts, or an
// admin removed the agent). Pages can't delete cookies, so they send people here: clear it, then sign in.
// Without this the middleware and the page would bounce between /login and the home page forever.
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?expired=1", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
