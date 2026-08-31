import { NextResponse } from "next/server";
import { getDevices } from "@/lib/videos";

export function GET() {
  return NextResponse.json(getDevices());
}
