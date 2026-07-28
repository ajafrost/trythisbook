import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAuthed } from "@/lib/adminAuth";

export const runtime = "nodejs";

const REPO = process.env.GITHUB_REPO || "ajafrost/trythisbook";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const FILE = "data/curation.json";
const API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

function gh(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ttb-admin",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function commit(
  token: string,
  id: string,
  text: string,
  needsReview: boolean,
  title: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  // Read current file (need its sha + content).
  const getRes = await fetch(`${API}?ref=${BRANCH}`, { headers: gh(token) });
  if (!getRes.ok) {
    return { ok: false, status: getRes.status, error: `read failed (${getRes.status})` };
  }
  const cur = (await getRes.json()) as { sha: string; content: string };
  const json = JSON.parse(
    Buffer.from(cur.content, "base64").toString("utf8")
  ) as { blurbs?: Record<string, { text: string; needsReview?: boolean }> };
  json.blurbs ??= {};
  const clean = text.trim();
  if (clean) json.blurbs[id] = { text: clean, needsReview };
  else delete json.blurbs[id];

  const putRes = await fetch(API, {
    method: "PUT",
    headers: { ...gh(token), "content-type": "application/json" },
    body: JSON.stringify({
      message: `Edit blurb: ${title}`.slice(0, 72),
      content: Buffer.from(JSON.stringify(json, null, 2) + "\n").toString("base64"),
      sha: cur.sha,
      branch: BRANCH,
    }),
  });
  if (putRes.ok) return { ok: true };
  return { ok: false, status: putRes.status, error: `commit failed (${putRes.status})` };
}

export async function POST(req: Request) {
  const jar = await cookies();
  if (!isAuthed(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Saving isn't configured (set GITHUB_TOKEN)." },
      { status: 503 }
    );
  }

  let body: { id?: string; text?: string; needsReview?: boolean; title?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { id, text = "", needsReview = false, title = "" } = body;
  if (!id || typeof text !== "string" || text.length > 2000) {
    return NextResponse.json({ error: "Invalid blurb." }, { status: 400 });
  }

  // One retry in case the file changed between read and write (sha conflict).
  let res = await commit(token, id, text, needsReview, title);
  if (!res.ok && res.status === 409) {
    res = await commit(token, id, text, needsReview, title);
  }
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
