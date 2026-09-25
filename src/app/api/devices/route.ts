import { NextResponse } from "next/server";
import { getDevices } from "@/lib/videos";

export async function GET() {
  return NextResponse.json(await getDevices());
}
