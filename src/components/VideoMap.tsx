"use client";

import { useEffect, useMemo, useState } from "react";
import {
CircleMarker,
MapContainer,
Popup,
TileLayer,
useMap,
} from "react-leaflet";
import { LatLngBounds } from "leaflet";
import type { VideoDetail, VideoSummary } from "@/types";
import { colorForDate } from "@/lib/palette";
import { api } from "@/lib/api";

// Argentina, roughly centred so the first paint shows the whole fleet area.
const INITIAL_CENTER: [number, number] = [-34.9, -63.0];
const INITIAL_ZOOM = 5;

const BASEMAPS = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    stroke: "#e2e8f0",
  },
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    stroke: "#0b1220",
  },
} as const;

export type Basemap = keyof typeof BASEMAPS;

function FitToVideos({ videos }: { videos: VideoSummary[] }) {
  const map = useMap();
  useEffect(() => {
    if (videos.length === 0) return;
    const bounds = new LatLngBounds(videos.map((v) => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13, animate: true });
  }, [videos, map]);
  return null;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Playable links only exist behind /api/videos/:id, fetched the moment a
// popup is actually opened — the bulk /api/videos list never carries them.
function VideoPopupBody({ video }: { video: VideoSummary }) {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .videoDetail(video.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [video.id]);

  return (
    <div className="overflow-hidden rounded-md">
      {detail ? (
        <video
          controls
          preload="none"
          poster={detail.thumbnail}
          src={detail.url}
          className="block h-[146px] w-full bg-black object-cover"
        />
      ) : (
        <div className="flex h-[146px] w-full items-center justify-center bg-black text-xs text-white/60">
          {failed ? "No se pudo cargar el video" : "Cargando…"}
        </div>
      )}
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{video.city}</span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
            {video.deviceId}
            {video.deviceName ? ` · ${video.deviceName}` : ""}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{video.address}</p>
        <p className="text-xs text-muted-foreground">
          {timeLabel(video.recordedAt)} · {video.durationSec}s · {video.lightLux} lux
        </p>
      </div>
    </div>
  );
}

export function VideoMap({
  videos,
  basemap = "light",
}: {
  videos: VideoSummary[];
  basemap?: Basemap;
}) {
  // Stable radius; larger dots when few points are on screen.
  const radius = useMemo(() => (videos.length > 40 ? 6 : 8), [videos.length]);
  const tiles = BASEMAPS[basemap];

  return (
    <MapContainer
      center={INITIAL_CENTER}
      zoom={INITIAL_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer key={basemap} attribution={tiles.attribution} url={tiles.url} />
      <FitToVideos videos={videos} />

      {videos.map((v) => (
        <CircleMarker
          key={v.id}
          center={[v.lat, v.lng]}
          radius={radius}
          pathOptions={{
            color: tiles.stroke,
            weight: 1.5,
            fillColor: colorForDate(v.date),
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <VideoPopupBody video={v} />
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
