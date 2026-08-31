import { NextResponse } from "next/server";
import { checkCredentials, sessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkCredentials(username, password)) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
