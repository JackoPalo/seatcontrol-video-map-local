import { NextResponse } from "next/server";
import { getSummary } from "@/lib/videos";

export async function GET() {
  return NextResponse.json(await getSummary());
}
