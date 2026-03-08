import { useState, useRef, useEffect } from "react";
import { AlarmClockOff } from "lucide-react";

interface SnoozeMenuProps {
  onSnooze: (minutes: number) => void;
  variant?: "destructive" | "accent";
}

const SNOOZE_OPTIONS = [
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
];

export default function SnoozeMenu({ onSnooze, variant = "accent" }: SnoozeMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isDestructive = variant === "destructive";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full p-1 transition-colors ${
          isDestructive
            ? "text-destructive/60 hover:bg-destructive/20 hover:text-destructive"
            : "text-accent-foreground/60 hover:bg-accent-foreground/10 hover:text-accent-foreground"
        }`}
        aria-label="Snooze"
        title="Snooze"
      >
        <AlarmClockOff size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-[100px] rounded-lg border border-border bg-card p-1 shadow-elevated">
          {SNOOZE_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              onClick={() => {
                onSnooze(opt.minutes);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
