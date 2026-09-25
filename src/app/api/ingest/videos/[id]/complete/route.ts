import { NextResponse } from "next/server";
import { completeVideo, isAuthorizedDevice, isIngestConfigured } from "@/lib/ingestStore";
import { invalidateVideoCache } from "@/lib/videos";

// POST /api/ingest/videos/:id/complete — the device finished the PUT.
// 200 when published (or already was), 404 unknown id, 409 when the mp4
// isn't in storage yet (device should retry the upload).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isIngestConfigured()) {
    return NextResponse.json({ error: "ingest not configured" }, { status: 503 });
  }
  if (!isAuthorizedDevice(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    const result = await completeVideo(id);
    switch (result) {
      case "ok":
      case "already":
        invalidateVideoCache();
        return NextResponse.json({ id, status: result });
      case "unknown-id":
        return NextResponse.json({ error: "unknown id" }, { status: 404 });
      case "missing-video":
        return NextResponse.json({ error: "video not uploaded" }, { status: 409 });
    }
  } catch (e) {
    console.error("ingest complete failed", e);
    return NextResponse.json({ error: "storage error" }, { status: 502 });
  }
}
