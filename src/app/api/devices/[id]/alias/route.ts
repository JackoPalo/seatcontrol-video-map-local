import { NextResponse } from "next/server";
import { isAliasStoreConfigured, MAX_ALIAS_LENGTH, setAlias } from "@/lib/aliases";

// PUT /api/devices/:id/alias — body { alias }. Empty alias removes it.
// Behind the site login (src/proxy.ts), like every non-ingest /api route.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAliasStoreConfigured()) {
    return NextResponse.json({ error: "alias storage not configured" }, { status: 503 });
  }

  const deviceId = decodeURIComponent((await params).id);
  const body = await req.json().catch(() => null);
  if (!deviceId || typeof body?.alias !== "string") {
    return NextResponse.json({ error: "alias (string) required" }, { status: 400 });
  }
  if (body.alias.trim().length > MAX_ALIAS_LENGTH) {
    return NextResponse.json(
      { error: `alias max ${MAX_ALIAS_LENGTH} characters` },
      { status: 400 }
    );
  }

  try {
    const aliases = await setAlias(deviceId, body.alias);
    return NextResponse.json({ deviceId, alias: aliases[deviceId] ?? "" });
  } catch (e) {
    console.error("alias write failed", e);
    return NextResponse.json({ error: "storage error" }, { status: 502 });
  }
}
