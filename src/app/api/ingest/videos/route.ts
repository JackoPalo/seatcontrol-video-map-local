import { NextResponse } from "next/server";
import {
  announceVideo,
  isAuthorizedDevice,
  isIngestConfigured,
  parseAnnounce,
} from "@/lib/ingestStore";

// POST /api/ingest/videos — a device announces a recorded clip.
// Body: { deviceId, deviceName?, lat, lng, recordedAt, durationSec? }
// Returns { id, uploadUrl, headers, expiresAt }: the device PUTs the mp4 to
// uploadUrl with exactly those headers, then calls .../:id/complete.
export async function POST(req: Request) {
  if (!isIngestConfigured()) {
    return NextResponse.json({ error: "ingest not configured" }, { status: 503 });
  }
  if (!isAuthorizedDevice(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = parseAnnounce(await req.json().catch(() => null));
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  try {
    return NextResponse.json(await announceVideo(parsed), { status: 201 });
  } catch (e) {
    console.error("ingest announce failed", e);
    return NextResponse.json({ error: "storage error" }, { status: 502 });
  }
}
