import { NextResponse } from "next/server";
import { getVideoById, invalidateVideoCache } from "@/lib/videos";
import { deleteVideo, isIngestConfigured } from "@/lib/ingestStore";
import type { VideoDetail } from "@/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = await getVideoById(Number(id));
  if (!video) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Hand back playable links that point at our own proxy routes, never the
  // upstream URL itself.
  const { url: _url, thumbnail: _thumbnail, ...summary } = video;
  const detail: VideoDetail = {
    ...summary,
    url: `/api/stream/${video.id}`,
    thumbnail: video.thumbnail ? `/api/thumb/${video.id}` : "",
  };
  return NextResponse.json(detail);
}

// DELETE /api/videos/:id — only clips stored by the device ingest (Blob) can
// be removed; mock data and the SeatControl backend are read-only here.
// Behind the site login (src/proxy.ts), like every non-ingest /api route.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isIngestConfigured()) {
    return NextResponse.json(
      { error: "deleting is only supported for device-ingest videos" },
      { status: 501 }
    );
  }
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await getVideoById(id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    await deleteVideo(id);
  } catch (e) {
    console.error("video delete failed", e);
    return NextResponse.json({ error: "storage error" }, { status: 502 });
  }
  invalidateVideoCache();
  return new Response(null, { status: 204 });
}
