import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

// RSS sync endpoint, hit by Vercel cron (spec 4.2), protected by a shared secret.
//
// v1 approach (spec 1.2 fallback): the real CSV→RSS merge happens at BUILD time
// in scripts/build-library.ts, so a fresh deploy always has the latest reads.
// This endpoint lets a daily cron revalidate the statically-generated pages so
// any newly-built data shows up without a manual redeploy. If you later want
// true runtime sync on Vercel's read-only filesystem, write library.json to
// Vercel Blob from here — but don't let that block launch.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const provided = auth?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/", "layout"); // refresh all statically-generated pages

  return NextResponse.json({
    ok: true,
    revalidated: true,
    at: new Date().toISOString(),
  });
}
