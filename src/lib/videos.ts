import type { DayCount, DeviceCount, Video, VideoSummary } from "@/types";
import raw from "@/data/videos.json";
import { fetchRealVideos, isBackendConfigured } from "@/lib/backendClient";
import { fetchIngestVideos, isIngestConfigured } from "@/lib/ingestStore";
import { getAliases } from "@/lib/aliases";

// Short TTL: in a live demo a new clip should show up within seconds.
const CACHE_TTL_MS = 15_000;
let cache: { videos: Video[]; expiresAt: number } | null = null;

export function invalidateVideoCache(): void {
  cache = null;
}

// Source priority: direct device ingest (Vercel Blob) > SeatControl backend
// > bundled mock data.
async function loadVideos(): Promise<Video[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.videos;

  const videos = isIngestConfigured()
    ? await fetchIngestVideos()
    : isBackendConfigured()
      ? await fetchRealVideos()
      : [...(raw as Video[])];
  videos.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  cache = { videos, expiresAt: Date.now() + CACHE_TTL_MS };
  return videos;
}

// Aliases are joined after the video cache on purpose: renaming a device
// shows up on the next request, not when the video list cache expires.
async function withAliases(videos: Video[]): Promise<Video[]> {
  const aliases = await getAliases();
  return videos.map((v) =>
    aliases[v.deviceId] ? { ...v, deviceAlias: aliases[v.deviceId] } : v
  );
}

function toSummary(v: Video): VideoSummary {
  const { url: _url, thumbnail: _thumbnail, ...summary } = v;
  return summary;
}

export async function videoCount(): Promise<number> {
  return (await loadVideos()).length;
}

export async function getVideos(filter: {
  date?: string;
  from?: string;
  to?: string;
  device?: string;
}): Promise<VideoSummary[]> {
  const videos = await withAliases(await loadVideos());
  return videos
    .filter((v) => {
      if (filter.date && v.date !== filter.date) return false;
      if (filter.from && v.date < filter.from) return false;
      if (filter.to && v.date > filter.to) return false;
      if (filter.device && v.deviceId !== filter.device) return false;
      return true;
    })
    .map(toSummary);
}

// Server-only: the real media URLs never leave this function. Callers
// (route handlers) either strip them (detail response, proxy paths instead)
// or use them internally to fetch bytes from upstream (stream/thumb proxies).
export async function getVideoById(id: number): Promise<Video | undefined> {
  const videos = await withAliases(await loadVideos());
  return videos.find((v) => v.id === id);
}

export async function getSummary(): Promise<DayCount[]> {
  const videos = await loadVideos();
  const counts = new Map<string, number>();
  for (const v of videos) counts.set(v.date, (counts.get(v.date) ?? 0) + 1);
  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDevices(): Promise<DeviceCount[]> {
  const videos = await loadVideos();
  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  for (const v of videos) {
    counts.set(v.deviceId, (counts.get(v.deviceId) ?? 0) + 1);
    if (v.deviceName) names.set(v.deviceId, v.deviceName);
  }
  const aliases = await getAliases();
  return [...counts.entries()]
    .map(([deviceId, count]) => ({
      deviceId,
      name: names.get(deviceId) ?? "",
      alias: aliases[deviceId],
      count,
    }))
    .sort((a, b) => a.deviceId.localeCompare(b.deviceId));
}
