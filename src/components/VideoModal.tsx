"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { ClipGroup } from "@/lib/groups";
import { clipSeconds } from "@/lib/groups";
import { colorForDate } from "@/lib/palette";
import { clockLabel, timeLabel, useClipDetail } from "@/lib/clipUtils";

function Player({ group }: { group: ClipGroup }) {
  const { clips } = group;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const clip = clips[index];
  const { detail, failed } = useClipDetail(clip.id);
  const { detail: nextDetail } = useClipDetail(
    playing ? clips[index + 1]?.id : undefined
  );

  // Switching stop starts over on its first clip.
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [group.key]);

  const goTo = (i: number) => {
    setPlaying(true);
    setIndex(i);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-md bg-black">
        {detail ? (
          <video
            key={clip.id}
            controls
            autoPlay={playing}
            preload={playing ? "auto" : "metadata"}
            poster={detail.thumbnail || undefined}
            src={detail.url}
            onPlay={() => setPlaying(true)}
            onEnded={() => index < clips.length - 1 && goTo(index + 1)}
            className="max-h-full max-w-full"
          />
        ) : (
          <span className="text-sm text-white/60">
            {failed ? "No se pudo cargar el video" : "Cargando…"}
          </span>
        )}
        {nextDetail && (
          <video src={nextDetail.url} preload="auto" muted className="hidden" />
        )}
      </div>

      {clips.length > 1 && (
        <div className="flex gap-0.5">
          {clips.map((c, i) => (
            <button
              key={c.id}
              onClick={() => goTo(i)}
              title={`Clip ${i + 1} · ${clockLabel(c.recordedAt)}`}
              style={{ flexGrow: clipSeconds(c), flexBasis: 0 }}
              className={`h-2.5 rounded-sm ${
                i === index
                  ? "bg-primary"
                  : i < index
                    ? "bg-primary/40"
                    : "bg-muted-foreground/25 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      )}

      <div className="text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {clip.city && <span className="font-semibold">{clip.city}</span>}
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {clip.deviceAlias || clip.deviceId}
          </span>
        </div>
        {clip.address && (
          <p className="text-xs text-muted-foreground">{clip.address}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {clips.length > 1 ? `Clip ${index + 1}/${clips.length} · ` : ""}
          {timeLabel(clip.recordedAt)}
          {clip.durationSec ? ` · ${clip.durationSec}s` : ""}
          {clip.lightLux ? ` · ${clip.lightLux} lux` : ""}
        </p>
      </div>
    </div>
  );
}

export function VideoModal({
  groups,
  initialKey,
  onClose,
}: {
  groups: ClipGroup[];
  initialKey?: string;
  onClose: () => void;
}) {
  // Chronological list, regardless of device.
  const sorted = useMemo(
    () =>
      [...groups].sort((a, b) =>
        a.clips[0].recordedAt.localeCompare(b.clips[0].recordedAt)
      ),
    [groups]
  );
  const [activeKey, setActiveKey] = useState<string | undefined>(
    initialKey ?? sorted[0]?.key
  );
  const active = sorted.find((g) => g.key === activeKey) ?? sorted[0];
  const totalClips = sorted.reduce((n, g) => n + g.clips.length, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Bring the opened stop into view in the list.
  useEffect(() => {
    if (!initialKey) return;
    document
      .getElementById(`modal-group-${initialKey}`)
      ?.scrollIntoView({ block: "center" });
  }, [initialKey]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h2 className="text-sm font-semibold">
            Videos · {sorted.length} paradas · {totalClips} clips
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:flex-row">
          {active ? (
            <Player group={active} />
          ) : (
            <p className="text-sm text-muted-foreground">Sin videos.</p>
          )}

          <ul className="flex max-h-48 shrink-0 flex-col gap-1.5 overflow-y-auto md:max-h-none md:w-80">
            {sorted.map((g) => {
              const first = g.clips[0];
              const isActive = g.key === active?.key;
              return (
                <li key={g.key} id={`modal-group-${g.key}`}>
                  <button
                    onClick={() => setActiveKey(g.key)}
                    className={`flex w-full items-center gap-3 rounded-md border p-1.5 text-left hover:bg-accent ${
                      isActive ? "border-primary bg-accent" : ""
                    }`}
                  >
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/thumb/${first.id}`}
                        alt=""
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                        className="h-full w-full object-cover"
                      />
                      {g.clips.length > 1 && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">
                          {g.clips.length}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: colorForDate(g.date) }}
                        />
                        <span className="truncate font-medium">
                          {first.city || first.deviceAlias || first.deviceId}
                        </span>
                      </div>
                      <p className="truncate text-muted-foreground">
                        {first.deviceAlias || first.deviceId}
                      </p>
                      <p className="tabular-nums text-muted-foreground">
                        {timeLabel(first.recordedAt)} · {g.totalDurationSec}s
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
