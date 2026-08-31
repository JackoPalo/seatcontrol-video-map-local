import { NextResponse } from "next/server";
import { videoCount } from "@/lib/videos";

export function GET() {
  return NextResponse.json({ status: "ok", videos: videoCount() });
}
