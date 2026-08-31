import { NextResponse } from "next/server";
import { getSummary } from "@/lib/videos";

export function GET() {
  return NextResponse.json(getSummary());
}
