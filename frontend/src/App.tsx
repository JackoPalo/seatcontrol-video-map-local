import { useEffect, useMemo, useState } from "react";
import { MapPin, Loader2, AlertTriangle } from "lucide-react";
import { api } from "./api";
import type { DayCount, Video } from "./types";
import { registerDates } from "./lib/palette";
import { DaySidebar } from "./components/DaySidebar";
import { VideoMap } from "./components/VideoMap";

export default function App() {
  const [days, setDays] = useState<DayCount[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.summary(), api.videos()])
      .then(([summary, videos]) => {
        registerDates(summary.map((d) => d.date));
        setDays(summary);
        setAllVideos(videos);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Error cargando datos")
      )
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => (selected ? allVideos.filter((v) => v.date === selected) : allVideos),
    [allVideos, selected]
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <MapPin className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">
            SeatControl · Mapa de videos
          </h1>
          <p className="text-xs text-muted-foreground">
            Videos subidos por la flota, por día y ubicación
          </p>
        </div>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="ml-auto text-xs text-primary hover:underline"
          >
            Ver todos los días
          </button>
        )}
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
              total={allVideos.length}
            />
            <main className="relative min-w-0 flex-1">
              <VideoMap videos={visible} />
              <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                {visible.length} videos
                {selected ? ` · ${selected}` : " · todos los días"}
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  );
}
