import { motion } from "framer-motion";
import { Trophy, Flame, Star } from "lucide-react";

interface DailyProductivityScoreProps {
  completedToday: number;
  totalToday: number;
  streak: number;
}

function getScoreEmoji(percent: number): { emoji: string; label: string; color: string } {
  if (percent === 100) return { emoji: "🏆", label: "Perfect Day!", color: "text-amber-500" };
  if (percent >= 75) return { emoji: "🔥", label: "On Fire!", color: "text-orange-500" };
  if (percent >= 50) return { emoji: "👍", label: "Good Progress", color: "text-primary" };
  if (percent >= 25) return { emoji: "💪", label: "Keep Going", color: "text-muted-foreground" };
  return { emoji: "🌱", label: "Just Starting", color: "text-muted-foreground" };
}

export default function DailyProductivityScore({ completedToday, totalToday, streak }: DailyProductivityScoreProps) {
  const percent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const score = getScoreEmoji(percent);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
            <Trophy size={16} className="text-primary" />
          </div>
          Today's Productivity
        </h3>
        <div className="flex items-center gap-6">
          {/* Circular Score */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted/50" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                strokeLinecap="round"
                className="stroke-primary"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - percent / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{percent}%</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <p className={`text-lg font-semibold ${score.color}`}>
              {score.emoji} {score.label}
            </p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Star size={14} className="text-primary" />
                {completedToday}/{totalToday} tasks done today
              </p>
              <p className="flex items-center gap-1.5">
                <Flame size={14} className="text-orange-500" />
                {streak} day streak
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
