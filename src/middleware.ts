import { NextResponse, type NextRequest } from "next/server";
import { HOME, SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC = ["/", "/login", "/signup", "/forgot-password", "/terms", "/demo", "/session-expired"];
const AUTH_ONLY = ["/login", "/signup", "/forgot-password"];

const matches = (pathname: string, list: string[]) => list.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !matches(pathname, PUBLIC)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (session && matches(pathname, AUTH_ONLY)) {
    return NextResponse.redirect(new URL(HOME[session.role], req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico|icon.svg|img/).*)"],
};
