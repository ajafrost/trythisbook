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

  const books: EditorBook[] = lovedBooks.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    coverUrl: b.coverUrl,
    myRating: b.myRating,
    blurb: blurbs[b.id]?.text ?? "",
    needsReview: blurbs[b.id]?.needsReview ?? false,
    hasReview: !!b.myReview?.trim(),
  }));

  // Attention first: no blurb, then needs-review, then the rest.
  books.sort((a, b) => {
    const rank = (x: EditorBook) => (!x.blurb ? 0 : x.needsReview ? 1 : 2);
    return rank(a) - rank(b) || a.title.localeCompare(b.title);
  });

  return <AdminEditor books={books} />;
}
