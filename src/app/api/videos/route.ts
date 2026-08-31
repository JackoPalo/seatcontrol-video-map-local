import { NextRequest, NextResponse } from "next/server";
import { getVideos } from "@/lib/videos";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const videos = getVideos({
    date: q.get("date") ?? undefined,
    from: q.get("from") ?? undefined,
    to: q.get("to") ?? undefined,
    device: q.get("device") ?? undefined,
  });
  return NextResponse.json(videos);
}
