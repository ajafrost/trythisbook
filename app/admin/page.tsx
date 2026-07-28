import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isAuthed } from "@/lib/adminAuth";
import { lovedBooks } from "@/lib/library";
import curationData from "@/data/curation.json";
import AdminEditor, { type EditorBook } from "@/components/AdminEditor";

export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
};

const blurbs = (curationData as { blurbs: Record<string, { text?: string; needsReview?: boolean }> }).blurbs ?? {};

export default async function AdminPage() {
  const jar = await cookies();
  if (!isAuthed(jar.get(ADMIN_COOKIE)?.value)) redirect("/admin/login");

  // Most recently rated first; undated (older imports) fall to the bottom.
  const books: EditorBook[] = [...lovedBooks]
    .sort(
      (a, b) =>
        (b.dateRead ?? "").localeCompare(a.dateRead ?? "") ||
        a.title.localeCompare(b.title)
    )
    .map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      coverUrl: b.coverUrl,
      myRating: b.myRating,
      blurb: blurbs[b.id]?.text ?? "",
      needsReview: blurbs[b.id]?.needsReview ?? false,
      hasReview: !!b.myReview?.trim(),
    }));

  return <AdminEditor books={books} />;
}
