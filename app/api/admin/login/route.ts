import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminConfigured,
  sessionToken,
  verifyPassword,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Admin isn't configured (set ADMIN_PASSWORD)." },
      { status: 503 }
    );
  }
  let password = "";
  try {
    ({ password = "" } = (await req.json()) as { password?: string });
  } catch {
    /* ignore */
  }
  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
