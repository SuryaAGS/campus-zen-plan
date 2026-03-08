import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock } from "lucide-react";
import { Task } from "@/types/task";

interface TaskRemindersProps {
  dueToday: Task[];
  dueTomorrow: Task[];
}

const TaskReminders = ({ dueToday, dueTomorrow }: TaskRemindersProps) => {
  if (dueToday.length === 0 && dueTomorrow.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 space-y-2"
      >
        {dueToday.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Due Today</p>
              <ul className="mt-1 space-y-0.5">
                {dueToday.map((t) => (
                  <li key={t.id} className="text-xs text-destructive/80">
                    • {t.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {dueTomorrow.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-ring/30 bg-accent px-4 py-3">
            <Clock size={18} className="mt-0.5 shrink-0 text-accent-foreground" />
            <div>
              <p className="text-sm font-semibold text-accent-foreground">Due Tomorrow</p>
              <ul className="mt-1 space-y-0.5">
                {dueTomorrow.map((t) => (
                  <li key={t.id} className="text-xs text-accent-foreground/80">
                    • {t.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default TaskReminders;
