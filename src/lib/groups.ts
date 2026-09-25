import type { VideoSummary } from "@/types";

// A "stop": consecutive clips from the same device at (about) the same place.
// While someone stays in front of a parked vehicle the device records clip
// after clip a few seconds apart; on the map those should be one marker that
// plays them back to back instead of N markers stacked on the same pixel.
export interface ClipGroup {
  key: string;
  deviceId: string;
  lat: number;
  lng: number;
  date: string;
  clips: VideoSummary[]; // oldest first
  totalDurationSec: number;
}

const MAX_DISTANCE_M = 50;
// Gap between the END of one clip and the START of the next.
const MAX_GAP_MS = 2 * 60 * 1000;
// Clips without a known duration are assumed to be the device's default.
const DEFAULT_CLIP_SEC = 10;

export const clipSeconds = (v: VideoSummary) => v.durationSec || DEFAULT_CLIP_SEC;

function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function groupClips(videos: VideoSummary[]): ClipGroup[] {
  const sorted = [...videos].sort(
    (a, b) =>
      a.deviceId.localeCompare(b.deviceId) || a.recordedAt.localeCompare(b.recordedAt)
  );

  const groups: ClipGroup[] = [];
  let current: ClipGroup | null = null;
  let currentEndMs = 0;

  for (const v of sorted) {
    const startMs = Date.parse(v.recordedAt);
    const joins =
      current !== null &&
      current.deviceId === v.deviceId &&
      startMs - currentEndMs <= MAX_GAP_MS &&
      distanceM(current.lat, current.lng, v.lat, v.lng) <= MAX_DISTANCE_M;

    if (joins && current) {
      current.clips.push(v);
      current.totalDurationSec += clipSeconds(v);
    } else {
      current = {
        key: String(v.id),
        deviceId: v.deviceId,
        lat: v.lat,
        lng: v.lng,
        date: v.date,
        clips: [v],
        totalDurationSec: clipSeconds(v),
      };
      groups.push(current);
      currentEndMs = 0;
    }
    currentEndMs = Math.max(currentEndMs, startMs + clipSeconds(v) * 1000);
  }

  return groups;
}
