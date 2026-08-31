// Full record, including the real (upstream) media links. Only ever read 
// server-side (src/lib/videos.ts) — never sent to the client as-is. 
export interface Video {
  id: number;
  deviceId: string;
  deviceName: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  recordedAt: string;
  date: string;
  durationSec: number;
  lightLux: number;
  url: string;
  thumbnail: string;
}

// What /api/videos returns: everything needed to plot a marker, with the
// media links stripped out so listing videos doesn't hand out every clip's
// download URL at once.
export type VideoSummary = Omit<Video, "url" | "thumbnail">;

// What /api/videos/:id returns when a popup actually opens: the summary
// plus playable links — but pointed at our own proxy routes, not the
// upstream origin.
export interface VideoDetail extends VideoSummary {
  url: string;
  thumbnail: string;
}

export interface DayCount {
  date: string;
  count: number;
}

export interface DeviceCount {
  deviceId: string;
  name: string;
  count: number;
}
