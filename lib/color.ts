// Deterministic placeholder colors for missing covers, drawn from the Slow Down
// palette: soft, warm pastels so gaps in the wall feel calm and intentional.
const PASTELS = [
  { bg: "#f2d6b3", fg: "#7a4f28" }, // peach
  { bg: "#cfdfe6", fg: "#37505e" }, // powder blue
  { bg: "#e7ddc9", fg: "#6a5a3a" }, // warm sand
  { bg: "#e9cdc4", fg: "#7a473c" }, // blush
  { bg: "#dbe1d2", fg: "#4a5540" }, // soft sage
  { bg: "#f0e0b8", fg: "#6f5a24" }, // butter
  { bg: "#ddd3e0", fg: "#544663" }, // soft lilac
  { bg: "#e5d5cb", fg: "#6b4b3a" }, // clay wash
];

export function pastelFor(seed: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PASTELS[h % PASTELS.length];
}
