import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  return (
    <div className="rounded-xl bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <motion.div
          animate={streak > 0 ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
        >
          <Flame
            size={32}
            className={streak > 0 ? "text-orange-500" : "text-muted-foreground"}
          />
        </motion.div>
        <div>
          <p className="font-display text-2xl font-bold text-card-foreground">
            {streak} day{streak !== 1 ? "s" : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {streak === 0
              ? "Complete a task to start your streak!"
              : streak >= 7
                ? "Incredible streak! Keep it going! 🔥"
                : "Daily streak — don't break the chain!"}
          </p>
        </div>
      </div>
    </div>
  );
}
