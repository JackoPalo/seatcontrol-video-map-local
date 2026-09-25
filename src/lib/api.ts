import type { DayCount, DeviceCount, VideoDetail, VideoSummary } from "@/types";

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
      return get<VideoSummary[]>(suffix ? `/api/videos?${suffix}` : "/api/videos");
    },
    // Fetched on demand — the only call that resolves to a playable link. 
    videoDetail: (id: number) => get<VideoDetail>(`/api/videos/${id}`),
    // Empty alias removes it. Resolves to the alias actually stored.
    setAlias: async (deviceId: string, alias: string): Promise<string> => {
      const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/alias`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `alias -> ${res.status}`);
      return body.alias as string;
    },
};
