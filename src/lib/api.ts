import type { DayCount, DeviceCount, Video } from "@/types";

// Same-origin: the /api/* Route Handlers live in this same Next.js app.
async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  summary: () => get<DayCount[]>("/api/summary"),
  devices: () => get<DeviceCount[]>("/api/devices"),
  videos: (opts?: { date?: string; device?: string }) => {
    const qs = new URLSearchParams();
    if (opts?.date) qs.set("date", opts.date);
    if (opts?.device) qs.set("device", opts.device);
    const suffix = qs.toString();
    return get<Video[]>(suffix ? `/api/videos?${suffix}` : "/api/videos");
  },
};
