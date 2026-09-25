import { NextResponse } from "next/server";
import { videoCount } from "@/lib/videos";

export async function GET() {
  return NextResponse.json({ status: "ok", videos: await videoCount() });
}
