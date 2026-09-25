// Streams an upstream resource back through our own response instead of
// redirecting to it, so the client never sees the origin URL. Forwards the
// Range header both ways so <video> seeking still works.
//
// Private Vercel Blob URLs (device ingest) additionally need the store token,
// which only ever travels server → Blob, never to the browser.
function isPrivateBlob(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function proxyMedia(url: string, req: Request): Promise<Response> {
  const privateBlob = isPrivateBlob(url);
  const upstreamHeaders: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) upstreamHeaders.range = range;
  if (privateBlob) {
    upstreamHeaders.authorization = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN ?? ""}`;
  }
  const upstream = await fetch(url, { headers: upstreamHeaders });

  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }

  const headers = new Headers();
  for (const h of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
  ]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  // Never let a shared cache keep a private clip; only the logged-in browser may.
  if (privateBlob) headers.set("cache-control", "private, max-age=3600");

  return new Response(upstream.body, { status: upstream.status, headers });
}
