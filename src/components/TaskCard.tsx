import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import { Task } from "@/types/task";

interface TaskCardProps {
  task: Task;
  index: number;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const priorityStyles = {
  High: "border-l-destructive text-destructive",
  Medium: "border-l-amber-500 text-amber-600",
  Low: "border-l-emerald-500 text-emerald-600",
};

const categoryColors: Record<string, string> = {
  Exam: "bg-red-100 text-red-700",
  Assignment: "bg-blue-100 text-blue-700",
  Project: "bg-purple-100 text-purple-700",
  Study: "bg-teal-100 text-teal-700",
  Other: "bg-gray-100 text-gray-600",
};

const categoryEmojis: Record<string, string> = {
  Exam: "📝",
  Assignment: "📚",
  Project: "🔧",
  Study: "📖",
  Other: "📌",
};

const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(({ task, index, onComplete, onDelete }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center justify-between rounded-lg border-l-4 bg-card p-4 shadow-card transition-all hover:shadow-elevated ${priorityStyles[task.priority].split(" ")[0]}`}
    >
      <div className="flex flex-col gap-1">
        <span className={`font-display font-semibold text-card-foreground ${task.completed ? "line-through opacity-50" : ""}`}>
          {task.title}
        </span>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`font-medium ${priorityStyles[task.priority].split(" ")[1]}`}>
            {task.priority}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[task.category] || categoryColors.Other}`}>
            {categoryEmojis[task.category] || "📌"} {task.category}
          </span>
          <span className="text-muted-foreground">{task.date}</span>
        </div>
      </div>
      <div className="flex gap-2">
        {!task.completed && (
          <button
            onClick={() => onComplete(task.id)}
            className="rounded-md bg-accent p-2 text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Check size={16} />
          </button>
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
});

TaskCard.displayName = "TaskCard";

export default TaskCard;
