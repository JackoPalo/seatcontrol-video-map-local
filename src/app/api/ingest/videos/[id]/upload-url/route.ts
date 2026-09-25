import { NextResponse } from "next/server";
import { isAuthorizedDevice, isIngestConfigured, renewUpload } from "@/lib/ingestStore";

// POST /api/ingest/videos/:id/upload-url — fresh upload URL for a clip that
// was announced but whose previous URL expired before the PUT succeeded.
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
    const ticket = await renewUpload(id);
    if (!ticket) return NextResponse.json({ error: "unknown id" }, { status: 404 });
    return NextResponse.json(ticket);
  } catch (e) {
    console.error("ingest renew failed", e);
    return NextResponse.json({ error: "storage error" }, { status: 502 });
  }
}
