import type { DayCount, Video } from "./types";

// Same-origin by default: nginx (prod) and the Vite dev server both proxy
// /api to the Go backend. Override with VITE_API_BASE if you point elsewhere.
const BASE = import.meta.env.VITE_API_BASE ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  summary: () => get<DayCount[]>("/api/summary"),
  videos: (date?: string) =>
    get<Video[]>(date ? `/api/videos?date=${encodeURIComponent(date)}` : "/api/videos"),
};
