import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sunrise, Sun, Moon, Footprints, Brain, Dumbbell, BookOpen,
  Code, Droplets, CalendarCheck, Sparkles, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface QuickTask {
  title: string;
  icon: React.ReactNode;
  defaultTime: string;
  category: string;
  priority: "High" | "Medium" | "Low";
}

const QUICK_TASKS: QuickTask[] = [
  { title: "Morning Walking", icon: <Footprints size={16} />, defaultTime: "06:30", category: "Other", priority: "Medium" },
  { title: "Meditation", icon: <Brain size={16} />, defaultTime: "07:00", category: "Other", priority: "Medium" },
  { title: "Drink Water", icon: <Droplets size={16} />, defaultTime: "08:00", category: "Other", priority: "Low" },
  { title: "Study", icon: <BookOpen size={16} />, defaultTime: "10:00", category: "Study", priority: "High" },
  { title: "Practice Coding", icon: <Code size={16} />, defaultTime: "14:00", category: "Project", priority: "High" },
  { title: "Evening Walking", icon: <Footprints size={16} />, defaultTime: "17:30", category: "Other", priority: "Medium" },
  { title: "Gym Workout", icon: <Dumbbell size={16} />, defaultTime: "18:00", category: "Other", priority: "Medium" },
  { title: "Plan Tomorrow", icon: <CalendarCheck size={16} />, defaultTime: "21:00", category: "Other", priority: "Low" },
];

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function getSuggestedTasks(): { label: string; icon: React.ReactNode; tasks: QuickTask[] } {
  const tod = getTimeOfDay();
  if (tod === "morning") {
    return {
      label: "Good Morning! Start your day right",
      icon: <Sunrise size={20} className="text-amber-500" />,
      tasks: QUICK_TASKS.filter(t => ["Morning Walking", "Meditation", "Drink Water", "Study"].includes(t.title)),
    };
  }
  if (tod === "afternoon") {
    return {
      label: "Afternoon focus time",
      icon: <Sun size={20} className="text-orange-500" />,
      tasks: QUICK_TASKS.filter(t => ["Study", "Practice Coding", "Drink Water"].includes(t.title)),
    };
  }
  return {
    label: "Wind down your evening",
    icon: <Moon size={20} className="text-indigo-400" />,
    tasks: QUICK_TASKS.filter(t => ["Evening Walking", "Gym Workout", "Plan Tomorrow"].includes(t.title)),
  };
}

interface SmartRoutineProps {
  existingTasks: Array<{ title: string; date: string; time: string | null; completed: boolean }>;
  onTaskAdded: () => void;
}

export default function SmartRoutine({ existingTasks, onTaskAdded }: SmartRoutineProps) {
  const { user } = useAuth();
  const [addingId, setAddingId] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];
  const suggested = getSuggestedTasks();

  const alreadyAdded = (title: string) =>
    existingTasks.some(t => t.title === title && t.date === today && !t.completed);

  const findNextFreeSlot = (preferredTime: string): string => {
    const todayTimes = existingTasks
      .filter(t => t.date === today && t.time && !t.completed)
      .map(t => t.time!)
      .sort();

    if (!todayTimes.includes(preferredTime)) return preferredTime;

    const [h, m] = preferredTime.split(":").map(Number);
    let minutes = h * 60 + m;
    for (let i = 0; i < 48; i++) {
      minutes += 30;
      if (minutes >= 1440) break;
      const slot = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      if (!todayTimes.includes(slot)) return slot;
    }
    return preferredTime;
  };

  const addQuickTask = async (task: QuickTask) => {
    if (!user || addingId) return;
    if (alreadyAdded(task.title)) {
      toast.info(`"${task.title}" is already on your list today`);
      return;
    }

    setAddingId(task.title);
    try {
      const time = findNextFreeSlot(task.defaultTime);
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: task.title,
        date: today,
        time,
        priority: task.priority,
        category: task.category,
        alarm_enabled: true,
      } as any);
      if (error) throw error;
      toast.success(`✅ "${task.title}" added at ${time}`);
      onTaskAdded();
    } catch {
      toast.error("Failed to add task");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Time-based suggestions */}
      <div className="glass-card overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-secondary/40 to-primary/20" />
        <div className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles size={16} className="text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground">Suggested Daily Tasks</h3>
          </div>
          <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            {suggested.icon}
            {suggested.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggested.tasks.map(task => {
              const added = alreadyAdded(task.title);
              const loading = addingId === task.title;
              return (
                <motion.button
                  key={task.title}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addQuickTask(task)}
                  disabled={added || !!addingId}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    added
                      ? "bg-primary/15 text-primary cursor-default"
                      : "glass text-foreground hover:bg-primary/20 hover:text-primary"
                  } disabled:opacity-60`}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : task.icon}
                  {task.title}
                  {added && <span className="text-xs">✓</span>}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* All Quick Add Buttons */}
      <div className="glass-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <h3 className="font-display font-semibold text-foreground">Quick Add</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Tap to instantly add a routine task</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_TASKS.map(task => {
            const added = alreadyAdded(task.title);
            const loading = addingId === task.title;
            return (
              <motion.button
                key={task.title}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => addQuickTask(task)}
                disabled={added || !!addingId}
                className={`glass-card flex flex-col items-center gap-1.5 p-3 text-center transition-all ${
                  added
                    ? "!bg-primary/15 text-primary"
                    : "hover:!bg-primary/10"
                } disabled:opacity-60`}
              >
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                  added ? "bg-primary/20" : "glass"
                }`}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : task.icon}
                </div>
                <span className="text-xs font-medium leading-tight text-foreground">{task.title}</span>
                <span className="text-[10px] text-muted-foreground">{task.defaultTime}</span>
                {added && <span className="text-[10px] font-semibold text-primary">Added ✓</span>}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
