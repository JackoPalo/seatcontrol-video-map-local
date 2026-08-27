// Stable per-day colour so a marker keeps its hue whether you view one day or
// all of them. Sorted dates map onto the palette in order, wrapping if needed.
const PALETTE = [
  "#60a5fa", // blue
  "#34d399", // green
  "#fbbf24", // amber
  "#f472b6", // pink
  "#a78bfa", // violet
  "#f87171", // red
  "#22d3ee", // cyan
  "#a3e635", // lime
];

const index = new Map<string, number>();

export function registerDates(dates: string[]) {
  index.clear();
  [...dates].sort().forEach((d, i) => index.set(d, i));
}

export function colorForDate(date: string): string {
  const i = index.get(date);
  if (i === undefined) return "#94a3b8"; // slate fallback
  return PALETTE[i % PALETTE.length];
}
