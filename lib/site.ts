// Canonical site identity. Keep in sync with metadataBase in app/layout.tsx.
export const SITE_URL = "https://trythisbook.com";
export const SITE_NAME = "Try This Book";

// Turn a relative path (or already-absolute URL) into an absolute URL.
export function absolute(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return SITE_URL + (path.startsWith("/") ? path : `/${path}`);
}
