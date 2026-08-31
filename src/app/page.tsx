"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Loader2, AlertTriangle, Calendar, X, Settings } from "lucide-react";
import { api } from "@/lib/api";
import type { DeviceCount, VideoSummary } from "@/types"; 
import { registerDates } from "@/lib/palette";
import { DaySidebar } from "@/components/DaySidebar";
import { DevicePanel } from "@/components/DevicePanel";
import type { Basemap } from "@/components/VideoMap";

// Leaflet touches `window` on import, so the map can only render client-side.
const VideoMap = dynamic(
  () => import("@/components/VideoMap").then((m) => m.VideoMap),
  { ssr: false }
);

function pillDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}-${m}-${y}`;
}

export default function Page() {
  const [allVideos, setAllVideos] = useState<VideoSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [device, setDevice] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("light");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.summary(), api.videos()])
      .then(([summary, videos]) => {
        registerDates(summary.map((d) => d.date));
        setAllVideos(videos);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Error cargando datos")
      )
      .finally(() => setLoading(false));
  }, []);

  // Device list is derived from the loaded catalogue so the filter always
  // matches what is actually on the map.
  const devices = useMemo<DeviceCount[]>(() => {
    const acc = new Map<string, { name: string; count: number }>();
    for (const v of allVideos) {
      const cur = acc.get(v.deviceId) ?? { name: v.deviceName, count: 0 };
      cur.count += 1;
      acc.set(v.deviceId, cur);
    }
    return [...acc.entries()]
      .map(([deviceId, { name, count }]) => ({ deviceId, name, count }))
      .sort((a, b) => a.deviceId.localeCompare(b.deviceId));
  }, [allVideos]);

  const byDevice = useMemo(
    () => (device ? allVideos.filter((v) => v.deviceId === device) : allVideos),
    [allVideos, device]
  );

  // Per-day counts follow the active device so the sidebar and map agree.
  const days = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of byDevice) counts.set(v.date, (counts.get(v.date) ?? 0) + 1);
    return [...counts.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [byDevice]);

  // Drop a day selection that the current device has no videos for.
  useEffect(() => {
    if (selected && !days.some((d) => d.date === selected)) setSelected(null);
  }, [days, selected]);

  const visible = useMemo(
    () => (selected ? byDevice.filter((v) => v.date === selected) : byDevice),
    [byDevice, selected]
  );

  const filtered = selected !== null || device !== null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b bg-card px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">
              SeatControl · Mapa de videos
            </h1>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="tabular-nums">
              {selected ? pillDate(selected) : "Todos los días"}
            </span>
            {device && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="font-medium">{device}</span>
              </>
            )}
            {filtered && (
              <button
                onClick={() => {
                  setSelected(null);
                  setDevice(null);
                }}
                className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Limpiar filtros"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setBasemap((b) => (b === "dark" ? "light" : "dark"))}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground"
          title={`Mapa ${basemap === "dark" ? "claro" : "oscuro"}`}
        >
          <Settings className="h-4 w-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p>No se pudo cargar la información.</p>
            <code className="rounded bg-muted px-2 py-1 text-xs">{error}</code>
          </div>
        ) : (
          <>
            <DaySidebar
              days={days}
              selected={selected}
              onSelect={setSelected}
              total={byDevice.length}
            />
            <main className="relative min-w-0 flex-1">
              <VideoMap videos={visible} basemap={basemap} />
              <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                {visible.length} videos
                {device ? ` · ${device}` : ""}
                {selected ? ` · ${selected}` : " · todos los días"}
              </div>
            </main>
            <DevicePanel
              devices={devices}
              selected={device}
              onSelect={setDevice}
            />
          </>
        )}
      </div>
    </div>
  );
}
