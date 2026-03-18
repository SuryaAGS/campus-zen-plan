import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Zap, ChevronRight } from "lucide-react";
import { Task } from "@/types/task";
import { getCategoryColor, getCategoryEmoji } from "@/lib/categoryColors";

interface TodayFocusProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onViewAll: () => void;
}

const priorityDots: Record<string, string> = {
  High: "bg-destructive",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

function TodayFocus({ tasks, onComplete, onViewAll }: TodayFocusProps) {
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks
    .filter((t) => t.date === today && !t.completed)
    .sort((a, b) => {
      const po: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      return po[a.priority] - po[b.priority] || (a.time || "").localeCompare(b.time || "");
    })
    .slice(0, 5);

  const completedToday = tasks.filter((t) => t.date === today && t.completed).length;
  const totalToday = tasks.filter((t) => t.date === today).length;

  // Find next upcoming task with time
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = tasks
    .filter((t) => t.date === today && !t.completed && t.time)
    .map((t) => {
      const [h, m] = t.time!.split(":").map(Number);
      return { ...t, minutes: h * 60 + m };
    })
    .filter((t) => t.minutes > nowMin)
    .sort((a, b) => a.minutes - b.minutes)[0];

  const minsUntilNext = upcoming ? upcoming.minutes - nowMin : null;
  const nextLabel = minsUntilNext !== null
    ? minsUntilNext < 60
      ? `in ${minsUntilNext}m`
      : `in ${Math.floor(minsUntilNext / 60)}h ${minsUntilNext % 60}m`
    : null;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
              <Zap size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Today's Focus</h3>
              <p className="text-[11px] text-muted-foreground">
                {completedToday}/{totalToday} done
                {nextLabel && upcoming && (
                  <span className="ml-1.5">
                    · Next: <span className="font-medium text-primary">{upcoming.title}</span> {nextLabel}
                  </span>
                )}
              </p>
            </div>
          </div>
          {totalToday > 0 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
              <span className="text-xs font-bold text-primary">{totalToday - completedToday}</span>
            </div>
          )}
        </div>

        {todayTasks.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-2 text-3xl">🎯</div>
            <p className="text-sm font-medium text-muted-foreground">
              {totalToday === 0 ? "No tasks scheduled for today" : "All done for today! 🎉"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {todayTasks.map((task, i) => {
                const catColor = getCategoryColor(task.category);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ delay: i * 0.03, duration: 0.15 }}
                    className="glass-card-lite flex items-center gap-3 px-3.5 py-3"
                  >
                    <button
                      onClick={() => onComplete(task.id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-muted-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <Check size={12} className="opacity-0 hover:opacity-100" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                        <span className={`inline-flex items-center gap-0.5 ${catColor.text}`}>
                          {getCategoryEmoji(task.category)} {task.category}
                        </span>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${priorityDots[task.priority]}`} />
                        <span className="text-muted-foreground">{task.priority}</span>
                      </div>
                    </div>
                    {task.time && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Clock size={10} />
                        {task.time}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {totalToday > 5 && (
          <button
            onClick={onViewAll}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            View all {totalToday} tasks <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(TodayFocus);
