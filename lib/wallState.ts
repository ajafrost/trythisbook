// Tiny per-tab client store for the wall's own URL — path (= genre) plus query
// (= shelf/length/sort/view), i.e. its complete filter state. The book URL is
// intentionally clean (/book/<slug>, no filters), so the modal can't read the
// active filters from the URL. The persistent <Wall> records its URL here so the
// wall stays fully filtered under the modal and close returns to that exact
// filtered wall.
let wallUrl = "/";

export const getWallUrl = () => wallUrl;
export const setWallUrl = (href: string) => {
  wallUrl = href;
};
