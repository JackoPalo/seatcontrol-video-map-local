import {
  head,
  issueSignedToken,
  list,
  parseStoreIdFromDelegationToken,
  presignUrl,
  put,
} from "@vercel/blob";
import type { Video } from "@/types";

// Direct device → video-map ingest, backed by Vercel Blob (no database).
// Used for the demo while the SeatControl backend's video support isn't in
// production. Layout inside the Blob store (a PRIVATE store: blobs are only
// readable with BLOB_READ_WRITE_TOKEN, i.e. only by this server):
//
//   demo/videos/<id>.mp4    the clip, PUT directly by the device (presigned)
//   demo/pending/<id>.json  metadata written when the device announces a clip
//   demo/done/<id>.json     same metadata, written once the mp4 is verified
//
// Every JSON is written exactly once and never overwritten, so the Blob CDN
// can't serve a stale version. The map only lists demo/done/.

const PREFIX = "demo";
const ACCESS = "private" as const;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const UPLOAD_URL_TTL_MS = 30 * 60 * 1000;
// Blob API version the SDK speaks (BLOB_API_VERSION in @vercel/blob 2.8).
// Presigned PUTs still need it as a header, so the device gets it from us.
const BLOB_API_VERSION = "12";

// Reading a private blob = GET its URL with the store token. Server-only.
export function blobReadHeaders(): Record<string, string> {
  return { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN ?? ""}` };
}

export function isIngestConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.INGEST_TOKEN);
}

// Constant-time comparison against INGEST_TOKEN (Authorization: Bearer ...).
export function isAuthorizedDevice(req: Request): boolean {
  const expected = process.env.INGEST_TOKEN;
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

export interface IngestMeta {
  id: number;
  deviceId: string;
  deviceName: string;
  lat: number;
  lng: number;
  recordedAt: string;
  durationSec: number;
}

export interface UploadTicket {
  id: number;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: number;
}

const videoPath = (id: number) => `${PREFIX}/videos/${id}.mp4`;
const pendingPath = (id: number) => `${PREFIX}/pending/${id}.json`;
const donePath = (id: number) => `${PREFIX}/done/${id}.json`;

// Millisecond timestamp * 1000 + random suffix: unique enough for a demo,
// numeric (the frontend keys videos by number) and still a safe integer.
function newId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

// Parses and validates the device's announce payload. Returns an error
// message instead of throwing so the route can answer 400.
export function parseAnnounce(
  body: unknown
): Omit<IngestMeta, "id"> | string {
  if (!body || typeof body !== "object") return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) return "invalid lat";
  if (!Number.isFinite(lng) || Math.abs(lng) > 180) return "invalid lng";
  if (typeof b.deviceId !== "string" || !b.deviceId) return "deviceId required";
  if (typeof b.recordedAt !== "string" || Number.isNaN(Date.parse(b.recordedAt))) {
    return "recordedAt must be an ISO-8601 date";
  }
  return {
    deviceId: b.deviceId.slice(0, 64),
    deviceName: typeof b.deviceName === "string" ? b.deviceName.slice(0, 64) : "",
    lat,
    lng,
    recordedAt: b.recordedAt,
    durationSec: Number.isFinite(Number(b.durationSec)) ? Number(b.durationSec) : 0,
  };
}

async function uploadTicket(id: number): Promise<UploadTicket> {
  const pathname = videoPath(id);
  const expiresAt = Date.now() + UPLOAD_URL_TTL_MS;
  const signed = await issueSignedToken({
    pathname,
    operations: ["put"],
    validUntil: expiresAt,
    allowedContentTypes: ["video/mp4"],
    maximumSizeInBytes: MAX_VIDEO_BYTES,
  });
  const { presignedUrl } = await presignUrl(signed, {
    operation: "put",
    pathname,
    access: ACCESS,
    allowedContentTypes: ["video/mp4"],
    maximumSizeInBytes: MAX_VIDEO_BYTES,
    addRandomSuffix: false,
    allowOverwrite: true, // a retried upload for the same id replaces the partial one
  });

  // Headers the SDK itself would send on a presigned PUT; the device copies
  // them verbatim so it doesn't need to know anything about Vercel Blob.
  return {
    id,
    uploadUrl: presignedUrl,
    headers: {
      "x-api-version": BLOB_API_VERSION,
      "x-vercel-blob-store-id": parseStoreIdFromDelegationToken(signed.delegationToken),
      "x-vercel-blob-access": ACCESS,
      "x-content-type": "video/mp4",
      "x-add-random-suffix": "0",
      "x-allow-overwrite": "1",
      "content-type": "video/mp4",
    },
    expiresAt,
  };
}

// Step 1: device announces a clip → pending metadata + where to PUT it.
export async function announceVideo(
  data: Omit<IngestMeta, "id">
): Promise<UploadTicket> {
  const meta: IngestMeta = { id: newId(), ...data };
  await put(pendingPath(meta.id), JSON.stringify(meta), {
    access: ACCESS,
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return uploadTicket(meta.id);
}

// Fresh upload URL for an already-announced clip (the previous one expired).
export async function renewUpload(id: number): Promise<UploadTicket | null> {
  if (!(await blobExists(pendingPath(id)))) return null;
  return uploadTicket(id);
}

async function blobExists(pathname: string): Promise<boolean> {
  try {
    await head(pathname);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(pathname: string): Promise<T | null> {
  try {
    const { url } = await head(pathname);
    const res = await fetch(url, { cache: "no-store", headers: blobReadHeaders() });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export type CompleteResult = "ok" | "already" | "unknown-id" | "missing-video";

// Step 3: device says the PUT finished → verify the mp4 exists, publish.
// Idempotent: a retried complete for an already-published clip is "already".
export async function completeVideo(id: number): Promise<CompleteResult> {
  if (await blobExists(donePath(id))) return "already";
  const meta = await readJson<IngestMeta>(pendingPath(id));
  if (!meta) return "unknown-id";

  let size: number;
  try {
    size = (await head(videoPath(id))).size;
  } catch {
    return "missing-video";
  }
  if (size === 0) return "missing-video";

  await put(donePath(id), JSON.stringify(meta), {
    access: ACCESS,
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return "ok";
}

function toVideo(meta: IngestMeta, videoUrl: string): Video {
  return {
    id: meta.id,
    deviceId: meta.deviceId,
    deviceName: meta.deviceName,
    city: "",
    address: "",
    lat: meta.lat,
    lng: meta.lng,
    recordedAt: meta.recordedAt,
    // The device sends local time with its UTC offset, so the first 10
    // chars are the local calendar day.
    date: meta.recordedAt.slice(0, 10),
    durationSec: meta.durationSec,
    lightLux: 0,
    url: videoUrl,
    thumbnail: "",
  };
}

export async function fetchIngestVideos(): Promise<Video[]> {
  const done: string[] = [];
  const videoUrls = new Map<string, string>();

  for (const prefix of [`${PREFIX}/done/`, `${PREFIX}/videos/`]) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const b of page.blobs) {
        if (prefix.endsWith("done/")) done.push(b.url);
        else videoUrls.set(b.pathname, b.url);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }

  const metas = await Promise.all(
    done.map(async (url) => {
      try {
        const res = await fetch(url, { headers: blobReadHeaders() });
        return res.ok ? ((await res.json()) as IngestMeta) : null;
      } catch {
        return null;
      }
    })
  );

  return metas.flatMap((m) => {
    const url = m && videoUrls.get(videoPath(m.id));
    return m && url ? [toVideo(m, url)] : [];
  });
}
