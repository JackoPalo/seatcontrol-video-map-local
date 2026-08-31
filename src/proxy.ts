import { NextRequest, NextResponse } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSession(cookie)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
