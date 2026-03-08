import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  GraduationCap, Moon, Sun, LogOut, UserCircle, CalendarDays, 
  Bell, ListTodo, TrendingUp, Target, Zap, ChevronRight, Clock, CheckCircle2, Plus, RefreshCw, BarChart3
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rawTasks, setRawTasks] = useState<Array<{ date: string; completed: boolean }>>([]);
  const [streak, setStreak] = useState<StreakData>({ current: 0, lastCompletionDate: null });
  const [dark, setDark] = useState(() => localStorage.getItem("collegemate-dark") === "true");
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null });
  const [rescheduledTasks, setRescheduledTasks] = useState<Array<{ id: string; title: string; date: string; time: string | null; missedCount: number }>>([]);

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

    const mapped = (data || []).map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date || tomorrowStr,
      time: t.time || null,
      priority: (t.priority as Task["priority"]) || "Medium",
      category: (t.category as Category) || "Other",
      completed: !!t.completed,
      missedCount: (t as any).missed_count ?? 0,
    }));

    setRawTasks((data || []).map((t) => ({ date: t.date || tomorrowStr, completed: !!t.completed })));
    setRescheduledTasks(mapped.filter((t) => !t.completed && t.missedCount > 0));
    const taskState: Task[] = mapped.map(({ missedCount, ...rest }) => rest);
    setTasks(taskState);
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

  const weeklyData = useMemo(() => {
    const days: { day: string; date: string; completed: number; total: number }[] = [];
    const now = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTasks = rawTasks.filter((t) => t.date === dateStr);
      const dayCompleted = dayTasks.filter((t) => t.completed);
      days.push({
        day: i === 0 ? "Today" : dayNames[d.getDay()],
        date: dateStr,
        completed: dayCompleted.length,
        total: dayTasks.length,
      });
    }
    return days;
  }, [rawTasks]);

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

        {/* Weekly Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
          <Card className="border-none shadow-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} width={24} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number, name: string) => [
                        value,
                        name === "completed" ? "Completed" : "Total",
                      ]}
                    />
                    <Bar dataKey="total" fill="hsl(var(--muted-foreground) / 0.25)" radius={[4, 4, 0, 0]} name="total" />
                    <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/25" />
                  Total
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
                  Completed
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>


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

        {/* AI Rescheduled Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-8"
        >
          <Card className="border-none shadow-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="h-5 w-5 text-primary" />
                AI Rescheduled Tasks
                {rescheduledTasks.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">{rescheduledTasks.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rescheduledTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No rescheduled tasks</p>
                  <p className="text-xs text-muted-foreground/70">Overdue tasks will appear here when auto-rescheduled</p>
                </div>
              ) : (
                rescheduledTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Moved to {t.date}{t.time ? ` at ${t.time}` : ""} · Rescheduled {t.missedCount}×
                      </p>
                    </div>
                    <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <RefreshCw size={12} />
                      {t.missedCount}×
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>


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
