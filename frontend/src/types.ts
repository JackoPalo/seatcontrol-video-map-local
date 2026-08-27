export interface Video {
  id: number;
  deviceId: string;
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

export interface DayCount {
  date: string;
  count: number;
}
