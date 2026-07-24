"use client";
import { useState } from "react";
import { pastelFor } from "@/lib/color";

type Props = {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  className?: string;
  priority?: boolean;
};

// Book cover with a graceful pastel typographic fallback — never a broken image
// (spec 3.3). Uses a plain <img> so we can catch Open Library 404s and swap in
// the placeholder client-side.
export default function Cover({
  id,
  title,
  author,
  coverUrl,
  className = "",
  priority,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !coverUrl || failed;

  if (showPlaceholder) {
    const { bg, fg } = pastelFor(id || title);
    return (
      <div
        className={`flex flex-col justify-between overflow-hidden p-3 text-left ${className}`}
        style={{ backgroundColor: bg, color: fg }}
        aria-label={`${title} by ${author}`}
      >
        <span className="font-serif text-[0.95rem] font-semibold leading-tight line-clamp-5">
          {title}
        </span>
        <span className="mt-2 text-[0.7rem] uppercase tracking-wide opacity-80 line-clamp-2">
          {author}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverUrl}
      alt={`${title} by ${author}`}
      loading={priority ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
