import type { Video } from "@/types";

// Real SeatControl backend (seatcontrol-backend/apps/api). Session-cookie
// auth: login once, cache the cookie, re-login on 401. See
// apps/api/pkg/auth/{middleware,sessions}.go for the cookie contract.

const BASE_URL = process.env.SEATCONTROL_API_BASE_URL;
const ORG_ID = process.env.SEATCONTROL_ORG_ID;
const EMAIL = process.env.SEATCONTROL_API_EMAIL;
const PASSWORD = process.env.SEATCONTROL_API_PASSWORD;

export function isBackendConfigured(): boolean {
  return Boolean(BASE_URL && ORG_ID && EMAIL && PASSWORD);
}

let sessionCookie: string | null = null;

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`SeatControl login failed: ${res.status}`);
  }

  const setCookie = res.headers.get("set-cookie");
  const match = setCookie?.match(/session=[^;]+/);
  if (!match) {
    throw new Error("SeatControl login response had no session cookie");
  }

  sessionCookie = match[0];
  return sessionCookie;
}

interface BackendVideo {
  id: number;
  url: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  device?: { name?: string; internalID?: string };
}

async function getVideosPage(cookie: string): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/${ORG_ID}/videos?uploaded=true`, {
    headers: { Cookie: cookie },
  });
}

function toVideo(v: BackendVideo): Video {
  return {
    id: v.id,
    deviceId: v.device?.internalID ?? "",
    deviceName: v.device?.name ?? "",
    city: "",
    address: "",
    lat: v.latitude,
    lng: v.longitude,
    recordedAt: v.createdAt,
    date: v.createdAt.slice(0, 10),
    durationSec: 0,
    lightLux: 0,
    url: v.url,
    thumbnail: "",
  };
}

export async function fetchRealVideos(): Promise<Video[]> {
  let cookie = sessionCookie ?? (await login());
  let res = await getVideosPage(cookie);

  if (res.status === 401) {
    sessionCookie = null;
    cookie = await login();
    res = await getVideosPage(cookie);
  }

  if (!res.ok) {
    throw new Error(`SeatControl videos fetch failed: ${res.status}`);
  }

  const raw: BackendVideo[] = await res.json();
  return raw.map(toVideo);
}
