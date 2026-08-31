"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { LatLngBounds } from "leaflet";
import type { Video } from "@/types";
import { colorForDate } from "@/lib/palette";

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

function FitToVideos({ videos }: { videos: Video[] }) {
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

export function VideoMap({
  videos,
  basemap = "light",
}: {
  videos: Video[];
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
            <div className="overflow-hidden rounded-md">
              <video
                controls
                preload="none"
                poster={v.thumbnail}
                src={v.url}
                className="block h-[146px] w-full bg-black object-cover"
              />
              <div className="space-y-1 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{v.city}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
                    {v.deviceId}
                    {v.deviceName ? ` · ${v.deviceName}` : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{v.address}</p>
                <p className="text-xs text-muted-foreground">
                  {timeLabel(v.recordedAt)} · {v.durationSec}s · {v.lightLux} lux
                </p>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
