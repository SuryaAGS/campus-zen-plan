import React from "react";
import { motion } from "framer-motion";
import { Check, Trash2, Undo2, Bell, BellOff } from "lucide-react";
import { Task } from "@/types/task";
import { getCategoryColor, getCategoryEmoji } from "@/lib/categoryColors";
import EditTaskDialog from "@/components/EditTaskDialog";

interface TaskCardProps {
  task: Task;
  index: number;
  onComplete: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onEdit: (id: string, updates: { title: string; date: string; time: string | null; priority: string; category: string; note?: string | null; alarm_enabled?: boolean }) => void;
  onDelete: (id: string) => void;
  onToggleAlarm?: (id: string, enabled: boolean) => void;
  allCategories: string[];
}

const priorityStyles = {
  High: "border-l-destructive text-destructive",
  Medium: "border-l-amber-500 text-amber-600",
  Low: "border-l-emerald-500 text-emerald-600",
};

const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  function TaskCard({ task, index, onComplete, onUncomplete, onEdit, onDelete, onToggleAlarm, allCategories }, ref) {
    const alarmOn = task.alarm_enabled !== false;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ delay: index * 0.05 }}
        className={`flex items-center justify-between rounded-lg border-l-4 bg-card p-4 shadow-card transition-all hover:shadow-elevated ${priorityStyles[task.priority].split(" ")[0]}`}
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-display font-semibold text-card-foreground ${task.completed ? "line-through opacity-50" : ""}`}>
              {task.title}
            </span>
            {task.time && !task.completed && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  alarmOn
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
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
            <span className={`font-medium ${priorityStyles[task.priority].split(" ")[1]}`}>
              {task.priority}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryColor(task.category).bg} ${getCategoryColor(task.category).text}`}>
              {getCategoryEmoji(task.category)} {task.category}
            </span>
            <span className="text-muted-foreground">{task.date}</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0 ml-2">
          {!task.completed && task.time && onToggleAlarm && (
            <button
              onClick={() => onToggleAlarm(task.id, !alarmOn)}
              className={`rounded-md p-2 transition-colors ${
                alarmOn
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              title={alarmOn ? "Disable alarm" : "Enable alarm"}
            >
              {alarmOn ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
          )}
          {!task.completed && (
            <button
              onClick={() => onComplete(task.id)}
              className="rounded-md bg-accent p-2 text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              title="Mark complete"
            >
              <Check size={16} />
            </button>
          )}
          {task.completed && onUncomplete && (
            <button
              onClick={() => onUncomplete(task.id)}
              className="rounded-md bg-accent p-2 text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
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
            className="rounded-md bg-muted p-2 text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </motion.div>
    );
  }
);

export default TaskCard;
