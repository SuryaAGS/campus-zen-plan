import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, X, AlarmClockOff } from "lucide-react";
import { Task } from "@/types/task";
import { toast } from "sonner";

interface TaskRemindersProps {
  dueToday: Task[];
  dueTomorrow: Task[];
}

const SNOOZE_KEY = "collegemate-snoozed-reminders";

function getSnoozed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setSnoozed(snoozed: Record<string, number>) {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(snoozed));
}

const TaskReminders = ({ dueToday, dueTomorrow }: TaskRemindersProps) => {
  const [dismissedToday, setDismissedToday] = useState(false);
  const [dismissedTomorrow, setDismissedTomorrow] = useState(false);
  const [snoozed, setSnoozedState] = useState<Record<string, number>>(getSnoozed);

  const now = Date.now();
  const isActive = (key: string) => !snoozed[key] || snoozed[key] < now;

  const snooze = (key: string, label: string) => {
    const updated = { ...snoozed, [key]: now + 30 * 60 * 1000 }; // 30 min
    setSnoozed(updated);
    setSnoozedState(updated);
    toast.info(`${label} snoozed for 30 minutes`);
  };

  const showToday = dueToday.length > 0 && !dismissedToday && isActive("today");
  const showTomorrow = dueTomorrow.length > 0 && !dismissedTomorrow && isActive("tomorrow");

  if (!showToday && !showTomorrow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 space-y-2"
      >
        {showToday && (
          <motion.div
            layout
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Due Today</p>
              <ul className="mt-1 space-y-0.5">
                {dueToday.map((t) => (
                  <li key={t.id} className="text-xs text-destructive/80">
                    • {t.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => snooze("today", "Due today")}
                className="rounded-full p-1 text-destructive/60 transition-colors hover:bg-destructive/20 hover:text-destructive"
                aria-label="Snooze 30 min"
                title="Snooze 30 min"
              >
                <AlarmClockOff size={14} />
              </button>
              <button
                onClick={() => setDismissedToday(true)}
                className="rounded-full p-1 text-destructive/60 transition-colors hover:bg-destructive/20 hover:text-destructive"
                aria-label="Dismiss"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {showTomorrow && (
          <motion.div
            layout
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 rounded-lg border border-ring/30 bg-accent px-4 py-3"
          >
            <Clock size={18} className="mt-0.5 shrink-0 text-accent-foreground" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-accent-foreground">Due Tomorrow</p>
              <ul className="mt-1 space-y-0.5">
                {dueTomorrow.map((t) => (
                  <li key={t.id} className="text-xs text-accent-foreground/80">
                    • {t.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => snooze("tomorrow", "Due tomorrow")}
                className="rounded-full p-1 text-accent-foreground/60 transition-colors hover:bg-accent-foreground/10 hover:text-accent-foreground"
                aria-label="Snooze 30 min"
                title="Snooze 30 min"
              >
                <AlarmClockOff size={14} />
              </button>
              <button
                onClick={() => setDismissedTomorrow(true)}
                className="rounded-full p-1 text-accent-foreground/60 transition-colors hover:bg-accent-foreground/10 hover:text-accent-foreground"
                aria-label="Dismiss"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default TaskReminders;
