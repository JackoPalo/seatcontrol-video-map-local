import type { DeviceCount } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  devices: DeviceCount[];
  selected: string | null;
  onSelect: (deviceId: string | null) => void;
}

export function DevicePanel({ devices, selected, onSelect }: Props) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold tracking-tight">Dispositivos</span>
        <span className="text-xs text-muted-foreground">{devices.length}</span>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {devices.map((d) => {
          const active = selected === d.deviceId;
          return (
            <button
              key={d.deviceId}
              onClick={() => onSelect(active ? null : d.deviceId)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-border bg-accent"
                  : "border-transparent hover:bg-accent/50"
              )}
            >
              <span className="text-sm font-semibold leading-tight">
                {d.deviceId}
              </span>
              <span className="text-xs text-muted-foreground">
                {d.name || `${d.count} video${d.count === 1 ? "" : "s"}`}
              </span>
            </button>
          );
        })}
      </div>

    </aside>
  );
}
