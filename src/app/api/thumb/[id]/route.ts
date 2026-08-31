import { getVideoById } from "@/lib/videos";
import { proxyMedia } from "@/lib/proxy";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = getVideoById(Number(id));
  if (!video || !video.thumbnail) return new Response(null, { status: 404 });
  return proxyMedia(video.thumbnail, req);
}
