import { useEffect, useState } from "react";
import type { VideoDetail } from "@/types";
import { api } from "@/lib/api";

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function clockLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Playable links only exist behind /api/videos/:id, fetched when a clip is
// about to play (the current one, plus the next to preload it) — the bulk
// /api/videos list never carries them.
export function useClipDetail(id: number | undefined) {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setDetail(null);
    setFailed(false);
    if (id === undefined) return;
    let cancelled = false;
    api
      .videoDetail(id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { detail, failed };
}
