"use client";

import { useEffect, useMemo, useState } from "react";
import {
CircleMarker,
MapContainer,
Popup,
TileLayer,
Tooltip,
useMap,
} from "react-leaflet";
import { LatLngBounds } from "leaflet";
import type { VideoDetail, VideoSummary } from "@/types";
import { colorForDate } from "@/lib/palette";
import { api } from "@/lib/api";
import { clipSeconds, groupClips, type ClipGroup } from "@/lib/groups";

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

function clockLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Playable links only exist behind /api/videos/:id, fetched when a clip is
// about to play (the current one, plus the next to preload it) — the bulk
// /api/videos list never carries them.
function useClipDetail(id: number | undefined) {
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

// One marker = one stop. Its clips play back to back in the same player:
// when one ends the next starts on its own, and the segmented bar shows
// where you are and lets you jump to any clip.
function GroupPopupBody({ group }: { group: ClipGroup }) {
  const { clips } = group;
  const [index, setIndex] = useState(0);
  // Only chain playback once the viewer has pressed play themselves.
  const [playing, setPlaying] = useState(false);
  const clip = clips[index];
  const { detail, failed } = useClipDetail(clip.id);
  const { detail: nextDetail } = useClipDetail(
    playing ? clips[index + 1]?.id : undefined
  );

  const goTo = (i: number) => {
    setPlaying(true);
    setIndex(i);
  };

  return (
    <div className="overflow-hidden rounded-md">
      {detail ? (
        <video
          key={clip.id}
          controls
          autoPlay={playing}
          preload={playing ? "auto" : "none"}
          poster={detail.thumbnail || undefined}
          src={detail.url}
          onPlay={() => setPlaying(true)}
          onEnded={() => index < clips.length - 1 && goTo(index + 1)}
          className="block h-[146px] w-full bg-black object-cover"
        />
      ) : (
        <div className="flex h-[146px] w-full items-center justify-center bg-black text-xs text-white/60">
          {failed ? "No se pudo cargar el video" : "Cargando…"}
        </div>
      )}
      {/* Warm up the next clip so the jump between clips is short. */}
      {nextDetail && (
        <video src={nextDetail.url} preload="auto" muted className="hidden" />
      )}

      {clips.length > 1 && (
        <div className="px-3 pt-2">
          <div className="flex gap-0.5">
            {clips.map((c, i) => (
              <button
                key={c.id}
                onClick={() => goTo(i)}
                title={`Clip ${i + 1} · ${clockLabel(c.recordedAt)}`}
                style={{ flexGrow: clipSeconds(c), flexBasis: 0 }}
                className={`h-2 rounded-sm ${
                  i === index
                    ? "bg-primary"
                    : i < index
                      ? "bg-primary/40"
                      : "bg-muted-foreground/25 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>
              Clip {index + 1}/{clips.length} · {clockLabel(clip.recordedAt)}
            </span>
            <span>
              {clockLabel(clips[0].recordedAt).slice(0, 5)}–
              {clockLabel(clips[clips.length - 1].recordedAt).slice(0, 5)} ·{" "}
              {group.totalDurationSec}s
            </span>
          </div>
        </div>
      )}
      <ClipInfo video={clip} />
    </div>
  );
}

function ClipInfo({ video }: { video: VideoSummary }) {
  return (
    <div className="space-y-1 p-3">
      <div className="flex items-center justify-between gap-2">
        {video.city && (
          <span className="text-sm font-semibold">{video.city}</span>
        )}
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
          {video.deviceId}
          {video.deviceName ? ` · ${video.deviceName}` : ""}
        </span>
      </div>
      {video.address && (
        <p className="text-xs text-muted-foreground">{video.address}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {[
          timeLabel(video.recordedAt),
          video.durationSec ? `${video.durationSec}s` : null,
          video.lightLux ? `${video.lightLux} lux` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
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
  const groups = useMemo(() => groupClips(videos), [videos]);
  // Stable radius; larger dots when few points are on screen.
  const radius = useMemo(() => (groups.length > 40 ? 6 : 8), [groups.length]);
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

      {groups.map((g) => (
        <CircleMarker
          key={g.key}
          center={[g.lat, g.lng]}
          // Stops with several clips get a bigger dot with the count on it.
          radius={g.clips.length > 1 ? radius + 4 : radius}
          pathOptions={{
            color: tiles.stroke,
            weight: 1.5,
            fillColor: colorForDate(g.date),
            fillOpacity: 0.9,
          }}
        >
          {g.clips.length > 1 && (
            <Tooltip permanent direction="center" className="clip-count">
              {g.clips.length}
            </Tooltip>
          )}
          <Popup>
            <GroupPopupBody group={g} />
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
