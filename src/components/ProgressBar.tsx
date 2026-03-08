import { motion } from "framer-motion";

interface ProgressBarProps {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-xl bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-semibold text-card-foreground">Productivity</h3>
        <span className="text-sm font-medium text-muted-foreground">
          {completed}/{total} tasks • {percent}%
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="gradient-progress h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
