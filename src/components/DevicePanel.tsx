import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import type { DeviceCount } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  devices: DeviceCount[];
  selected: string | null;
  onSelect: (deviceId: string | null) => void;
  // Resolves once saved; rejects with a message to show under the input.
  onRename: (deviceId: string, alias: string) => Promise<void>;
}

export function DevicePanel({ devices, selected, onSelect, onRename }: Props) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold tracking-tight">Dispositivos</span>
        <span className="text-xs text-muted-foreground">{devices.length}</span>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {devices.map((d) =>
          editing === d.deviceId ? (
            <AliasEditor
              key={d.deviceId}
              device={d}
              onSave={(alias) => onRename(d.deviceId, alias)}
              onDone={() => setEditing(null)}
            />
          ) : (
            <DeviceRow
              key={d.deviceId}
              device={d}
              active={selected === d.deviceId}
              onSelect={() => onSelect(selected === d.deviceId ? null : d.deviceId)}
              onEdit={() => setEditing(d.deviceId)}
            />
          )
        )}
      </div>
    </aside>
  );
}

function DeviceRow({
  device: d,
  active,
  onSelect,
  onEdit,
}: {
  device: DeviceCount;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const count = `${d.count} video${d.count === 1 ? "" : "s"}`;
  return (
    <div
      className={cn(
        "group flex items-start gap-1 rounded-md border px-3 py-2.5 transition-colors",
        active ? "border-border bg-accent" : "border-transparent hover:bg-accent/50"
      )}
    >
      <button onClick={onSelect} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
        <span className="w-full truncate text-sm font-semibold leading-tight">
          {d.alias || d.deviceId}
        </span>
        <span className="w-full truncate text-xs text-muted-foreground">
          {d.name || count}
        </span>
        {/* With an alias, keep the real ID visible (small) so it can still be traced. */}
        {d.alias && (
          <span className="w-full truncate font-mono text-[10px] text-muted-foreground/70">
            {d.deviceId}
          </span>
        )}
      </button>
      <button
        onClick={onEdit}
        title="Renombrar dispositivo"
        className="rounded p-1 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground focus:opacity-100 group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AliasEditor({
  device: d,
  onSave,
  onDone,
}: {
  device: DeviceCount;
  onSave: (alias: string) => Promise<void>;
  onDone: () => void;
}) {
  const [value, setValue] = useState(d.alias ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-accent px-3 py-2.5">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={value}
          maxLength={40}
          disabled={saving}
          placeholder={d.deviceId}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") onDone();
          }}
          className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={save}
          disabled={saving}
          title="Guardar"
          className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onDone}
          disabled={saving}
          title="Cancelar"
          className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
        {error ?? `${d.deviceId} · vacío = quitar alias`}
      </p>
    </div>
  );
}
