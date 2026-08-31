import { CalendarDays, Layers } from "lucide-react";
import type { DayCount } from "@/types";
import { cn } from "@/lib/utils";
import { colorForDate } from "@/lib/palette";
import { Badge } from "@/components/ui/badge";

function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

interface Props {
  days: DayCount[];
  selected: string | null;
  onSelect: (date: string | null) => void;
  total: number;
}

export function DaySidebar({ days, selected, onSelect, total }: Props) {
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r bg-card">
      <div className="border-b p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-primary" />
          Videos por día
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {total} videos subidos · {days.length} días activos
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
            selected === null
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Todos los días
          </span>
          <Badge variant={selected === null ? "secondary" : "outline"}>
            {total}
          </Badge>
        </button>

        {days.map((d) => {
          const active = selected === d.date;
          return (
            <button
              key={d.date}
              onClick={() => onSelect(d.date)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorForDate(d.date) }}
              />
              <span className="flex-1">
                <span className="block capitalize">{dayLabel(d.date)}</span>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${(d.count / max) * 100}%` }}
                  />
                </span>
              </span>
              <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">
                {d.count}
              </span>
            </button>
          );
        })}
      </div>

    </aside>
  );
}
