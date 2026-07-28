// One consistent "5★" marker, pinned to the top-right of a book cover. Used on
// every cover grid/card (the wall, shelf cards, "if you liked this" cards, rec
// results) so 5-star books are flagged the same way everywhere. Not used on the
// large detail cover, which shows the full ★★★★★ row instead.
export default function FiveStarBadge() {
  return (
    <span
      aria-label="Five stars"
      className="pointer-events-none absolute right-1.5 top-1.5 z-10 rounded-full bg-paper/90 px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent-deep shadow-sm"
    >
      ★ 5
    </span>
  );
}
