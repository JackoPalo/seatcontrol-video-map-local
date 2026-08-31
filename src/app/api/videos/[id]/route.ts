import { NextResponse } from "next/server";
import { getVideoById } from "@/lib/videos";
import type { VideoDetail } from "@/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = getVideoById(Number(id));
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
