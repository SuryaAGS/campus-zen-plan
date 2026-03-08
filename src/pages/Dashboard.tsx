import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  GraduationCap, Moon, Sun, LogOut, UserCircle, CalendarDays, 
  Bell, ListTodo, TrendingUp, Target, Zap, ChevronRight, Clock, CheckCircle2, Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import FeedbackDialog from "@/components/FeedbackDialog";
import mascot from "@/assets/mascot.png";
import { Task, Category } from "@/types/task";
import { refreshStreak, StreakData } from "@/lib/tasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StreakBadge from "@/components/StreakBadge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streak, setStreak] = useState<StreakData>({ current: 0, lastCompletionDate: null });
  const [dark, setDark] = useState(() => localStorage.getItem("collegemate-dark") === "true");
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
        } else {
          const meta = user.user_metadata;
          setProfile({
            display_name: meta?.full_name || meta?.display_name || meta?.name || null,
            avatar_url: meta?.avatar_url || meta?.picture || null,
          });
        }
      });
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("collegemate-dark", String(dark));
  }, [dark]);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const mapped: Task[] = (data || []).map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date || tomorrowStr,
      time: t.time || null,
      priority: (t.priority as Task["priority"]) || "Medium",
      category: (t.category as Category) || "Other",
      completed: !!t.completed,
    }));
    setTasks(mapped);
    setStreak(refreshStreak());
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const today = new Date().toISOString().split("T")[0];
  const dueToday = pending.filter((t) => t.date === today);
  const highPriority = pending.filter((t) => t.priority === "High");
  const progressPercent = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Profile - Left */}
      <button
        onClick={() => navigate("/profile")}
        className="fixed left-3 top-3 z-50 flex items-center gap-1.5 rounded-full bg-card px-2 py-1 shadow-elevated transition-all hover:scale-105"
        aria-label="Profile"
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <UserCircle size={16} className="text-foreground" />
        )}
        {profile.display_name && (
          <span className="max-w-[90px] truncate text-xs font-medium text-foreground">
            {profile.display_name}
          </span>
        )}
      </button>

      {/* Controls - Right */}
      <div className="fixed right-2 top-2 z-50 flex items-center gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
        <FeedbackDialog />
        <button
          onClick={() => navigate("/notifications")}
          className="rounded-full bg-card p-2 shadow-elevated transition-all hover:scale-110 sm:p-3"
          aria-label="Notification settings"
        >
          <Bell size={18} className="text-foreground sm:size-5" />
        </button>
        <button
          onClick={() => navigate("/calendar")}
          className="rounded-full bg-card p-2 shadow-elevated transition-all hover:scale-110 sm:p-3"
          aria-label="Calendar view"
        >
          <CalendarDays size={18} className="text-foreground sm:size-5" />
        </button>
        <button
          onClick={() => setDark((d) => !d)}
          className="rounded-full bg-card p-2 shadow-elevated transition-all hover:scale-110 sm:p-3"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun size={18} className="text-foreground sm:size-5" /> : <Moon size={18} className="text-foreground sm:size-5" />}
        </button>
        <button
          onClick={signOut}
          className="rounded-full bg-card p-2 shadow-elevated transition-all hover:scale-110 sm:p-3"
          aria-label="Sign out"
        >
          <LogOut size={18} className="text-foreground sm:size-5" />
        </button>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-16 pt-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <img src={mascot} alt="Mascot" className="h-16 w-16 drop-shadow-lg" />
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                Welcome back{profile.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}!
              </h1>
              <p className="text-muted-foreground">Here's your productivity overview</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          <motion.div variants={itemVariants}>
            <Card className="border-none bg-gradient-to-br from-primary/20 to-primary/5 shadow-card">
              <CardContent className="p-4 text-center">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <ListTodo className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{pending.length}</p>
                <p className="text-xs text-muted-foreground">Pending Tasks</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-none bg-gradient-to-br from-green-500/20 to-green-500/5 shadow-card">
              <CardContent className="p-4 text-center">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-2xl font-bold text-foreground">{completed.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-none bg-gradient-to-br from-orange-500/20 to-orange-500/5 shadow-card">
              <CardContent className="p-4 text-center">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-foreground">{dueToday.length}</p>
                <p className="text-xs text-muted-foreground">Due Today</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-none bg-gradient-to-br from-red-500/20 to-red-500/5 shadow-card">
              <CardContent className="p-4 text-center">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-2xl font-bold text-foreground">{highPriority.length}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="border-none shadow-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion rate</span>
                <span className="font-semibold text-foreground">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                {completed.length} of {tasks.length} tasks completed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card className="border-none bg-gradient-to-br from-accent to-accent/50 shadow-elevated">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-foreground/10">
                <Zap className="h-7 w-7 text-accent-foreground" />
              </div>
              <div>
                <p className="text-3xl font-bold text-accent-foreground">{streak.current}</p>
                <p className="text-sm text-accent-foreground/80">Day Streak 🔥</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate("/tasks")}
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-elevated transition-all hover:scale-105 hover:shadow-card"
            >
              <Plus className="h-6 w-6" />
              Add Task
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate("/my-tasks")}
              className="group inline-flex items-center gap-3 rounded-full border-2 border-primary bg-background px-8 py-4 text-lg font-semibold text-primary shadow-sm transition-all hover:scale-105 hover:bg-primary/5"
            >
              <ListTodo className="h-6 w-6" />
              View Tasks
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
