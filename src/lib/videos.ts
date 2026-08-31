import type { DayCount, DeviceCount, Video } from "@/types";
import raw from "@/data/videos.json";

const videos: Video[] = [...(raw as Video[])].sort((a, b) =>
  a.recordedAt.localeCompare(b.recordedAt)
);

export function videoCount(): number {
  return videos.length;
}

export function getVideos(filter: {
  date?: string;
  from?: string;
  to?: string;
  device?: string;
}): Video[] {
  return videos.filter((v) => {
    if (filter.date && v.date !== filter.date) return false;
    if (filter.from && v.date < filter.from) return false;
    if (filter.to && v.date > filter.to) return false;
    if (filter.device && v.deviceId !== filter.device) return false;
    return true;
  });
}

export function getSummary(): DayCount[] {
  const counts = new Map<string, number>();
  for (const v of videos) counts.set(v.date, (counts.get(v.date) ?? 0) + 1);
  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getDevices(): DeviceCount[] {
  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  for (const v of videos) {
    counts.set(v.deviceId, (counts.get(v.deviceId) ?? 0) + 1);
    if (v.deviceName) names.set(v.deviceId, v.deviceName);
  }
  return [...counts.entries()]
    .map(([deviceId, count]) => ({
      deviceId,
      name: names.get(deviceId) ?? "",
      count,
    }))
    .sort((a, b) => a.deviceId.localeCompare(b.deviceId));
}
