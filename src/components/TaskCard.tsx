import React, { memo } from "react";
import { motion } from "framer-motion";
import { Check, Trash2, Undo2, Bell, BellOff, Repeat } from "lucide-react";
import { Task } from "@/types/task";
import { getCategoryColor, getCategoryEmoji } from "@/lib/categoryColors";
import EditTaskDialog from "@/components/EditTaskDialog";

interface TaskCardProps {
  task: Task;
  index: number;
  onComplete: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onEdit: (id: string, updates: { title: string; date: string; time: string | null; priority: string; category: string; note?: string | null; alarm_enabled?: boolean; repeat?: string }) => void;
  onDelete: (id: string) => void;
  onToggleAlarm?: (id: string, enabled: boolean) => void;
  allCategories: string[];
}

const priorityAccents = {
  High: "border-l-destructive",
  Medium: "border-l-amber-500",
  Low: "border-l-emerald-500",
};

const priorityText = {
  High: "text-destructive",
  Medium: "text-amber-600 dark:text-amber-400",
  Low: "text-emerald-600 dark:text-emerald-400",
};

const TaskCard = memo(
  React.forwardRef<HTMLDivElement, TaskCardProps>(
    function TaskCard({ task, index, onComplete, onUncomplete, onEdit, onDelete, onToggleAlarm, allCategories }, ref) {
      const alarmOn = task.alarm_enabled !== false;

      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ delay: Math.min(index * 0.03, 0.15), duration: 0.15 }}
          className={`glass-card-lite flex items-center justify-between border-l-4 p-4 transition-shadow hover:shadow-card ${priorityAccents[task.priority]}`}
        >
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-display font-semibold text-foreground ${task.completed ? "line-through opacity-50" : ""}`}>
                {task.title}
              </span>
              {task.time && !task.completed && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    alarmOn
                      ? "bg-primary/15 text-primary"
                      : "glass-card-lite text-muted-foreground"
                  }`}
                  title={alarmOn ? "Alarm enabled" : "Alarm disabled"}
                >
                  {alarmOn ? <Bell size={10} /> : <BellOff size={10} />}
                  {task.time}
                </span>
              )}
            </div>
            {task.note && (
              <p className="text-xs text-muted-foreground italic line-clamp-2">{task.note}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`font-medium ${priorityText[task.priority]}`}>
                {task.priority}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryColor(task.category).bg} ${getCategoryColor(task.category).text}`}>
                {getCategoryEmoji(task.category)} {task.category}
              </span>
              <span className="text-muted-foreground">{task.date}</span>
              {task.repeat && task.repeat !== "none" && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  <Repeat size={10} /> {task.repeat}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0 ml-2">
            {!task.completed && task.time && onToggleAlarm && (
              <button
                onClick={() => onToggleAlarm(task.id, !alarmOn)}
                className={`rounded-xl p-2 transition-colors ${
                  alarmOn
                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={alarmOn ? "Disable alarm" : "Enable alarm"}
              >
                {alarmOn ? <Bell size={16} /> : <BellOff size={16} />}
              </button>
            )}
            {!task.completed && (
              <button
                onClick={() => onComplete(task.id)}
                className="rounded-xl p-2 text-accent-foreground transition-colors hover:bg-primary/20 hover:text-primary"
                title="Mark complete"
              >
                <Check size={16} />
              </button>
            )}
            {task.completed && onUncomplete && (
              <button
                onClick={() => onUncomplete(task.id)}
                className="rounded-xl p-2 text-accent-foreground transition-colors hover:bg-primary/20 hover:text-primary"
                title="Mark as pending"
              >
                <Undo2 size={16} />
              </button>
            )}
            {!task.completed && (
              <EditTaskDialog task={task} allCategories={allCategories} onSave={onEdit} />
            )}
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </motion.div>
      );
    }
  ),
  (prev, next) =>
    prev.task.id === next.task.id &&
    prev.task.title === next.task.title &&
    prev.task.completed === next.task.completed &&
    prev.task.date === next.task.date &&
    prev.task.time === next.task.time &&
    prev.task.priority === next.task.priority &&
    prev.task.category === next.task.category &&
    prev.task.note === next.task.note &&
    prev.task.alarm_enabled === next.task.alarm_enabled &&
    prev.index === next.index
);

export default TaskCard;
