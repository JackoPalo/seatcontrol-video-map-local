// Streams an upstream resource back through our own response instead of
// redirecting to it, so the client never sees the origin URL. Forwards the
// Range header both ways so <video> seeking still works.
export async function proxyMedia(url: string, req: Request): Promise<Response> {
  const range = req.headers.get("range");
  const upstream = await fetch(url, range ? { headers: { range } } : undefined);

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

  return new Response(upstream.body, { status: upstream.status, headers });
}
