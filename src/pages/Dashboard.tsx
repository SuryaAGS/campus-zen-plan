import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  ClipboardCheck, Moon, Sun, LogOut, UserCircle, CalendarDays, 
  Bell, ListTodo, TrendingUp, Target, Zap, ChevronRight, Clock, CheckCircle2, Plus, RefreshCw, BarChart3, StickyNote, Save, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import FeedbackDialog from "@/components/FeedbackDialog";
import appIcon from "@/assets/app-icon.png";
import { Task, Category } from "@/types/task";
import { refreshStreak, StreakData } from "@/lib/tasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StreakBadge from "@/components/StreakBadge";
import AiSuggestion from "@/components/AiSuggestion";
import { useAiSuggestion } from "@/hooks/useAiSuggestion";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SmartRoutine from "@/components/SmartRoutine";
import DailyProductivityScore from "@/components/DailyProductivityScore";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rawTasks, setRawTasks] = useState<Array<{ date: string; completed: boolean }>>([]);
  const [streak, setStreak] = useState<StreakData>({ current: 0, lastCompletionDate: null });
  const [dark, setDark] = useState(() => localStorage.getItem("taskstodo-dark") === "true");
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null });
  const [rescheduledTasks, setRescheduledTasks] = useState<Array<{ id: string; title: string; date: string; time: string | null; missedCount: number }>>([]);

  // Quick Notes state
  const [quickNotes, setQuickNotes] = useState<Array<{ id: string; text: string; created: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem("taskstodo-quick-notes") || "[]");
    } catch { return []; }
  });
  const [newNote, setNewNote] = useState("");

  const saveNotes = (notes: typeof quickNotes) => {
    setQuickNotes(notes);
    localStorage.setItem("taskstodo-quick-notes", JSON.stringify(notes));
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note = { id: crypto.randomUUID(), text: newNote.trim(), created: new Date().toISOString() };
    saveNotes([note, ...quickNotes]);
    setNewNote("");
  };

  const deleteNote = (id: string) => {
    saveNotes(quickNotes.filter(n => n.id !== id));
  };

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
    localStorage.setItem("taskstodo-dark", String(dark));
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
      alarm_enabled: (t as any).alarm_enabled !== false,
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

  const { suggestion: aiSuggestion, loading: aiLoading, refresh: refreshAi } = useAiSuggestion(tasks.length);

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
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="app-gradient-bg">
      {/* Profile - Left */}
      <button
        onClick={() => navigate("/profile")}
        className="fixed left-3 top-3 z-50 flex items-center gap-1.5 glass rounded-full px-3 py-1.5 transition-all hover:scale-105"
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
          className="glass rounded-full p-2 transition-all hover:scale-110 sm:p-3"
          aria-label="Notification settings"
        >
          <Bell size={18} className="text-foreground sm:size-5" />
        </button>
        <button
          onClick={() => navigate("/calendar")}
          className="glass rounded-full p-2 transition-all hover:scale-110 sm:p-3"
          aria-label="Calendar view"
        >
          <CalendarDays size={18} className="text-foreground sm:size-5" />
        </button>
        <button
          onClick={() => setDark((d) => !d)}
          className="glass rounded-full p-2 transition-all hover:scale-110 sm:p-3"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun size={18} className="text-foreground sm:size-5" /> : <Moon size={18} className="text-foreground sm:size-5" />}
        </button>
        <button
          onClick={signOut}
          className="glass rounded-full p-2 transition-all hover:scale-110 sm:p-3"
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
            <img src={appIcon} alt="Tasks To Do" className="h-16 w-16 drop-shadow-lg" />
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
          {[
            { label: "Pending Tasks", value: pending.length, icon: ListTodo, gradient: "from-primary/20 to-primary/5", iconBg: "bg-primary/15", iconColor: "text-primary", filter: "pending" },
            { label: "Completed", value: completed.length, icon: CheckCircle2, gradient: "from-emerald-500/20 to-emerald-500/5", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400", filter: "completed" },
            { label: "Due Today", value: dueToday.length, icon: Clock, gradient: "from-amber-500/20 to-amber-500/5", iconBg: "bg-amber-500/15", iconColor: "text-amber-600 dark:text-amber-400", filter: "today" },
            { label: "High Priority", value: highPriority.length, icon: Target, gradient: "from-red-500/20 to-red-500/5", iconBg: "bg-red-500/15", iconColor: "text-red-600 dark:text-red-400", filter: "high" },
          ].map((stat) => (
            <motion.div key={stat.filter} variants={itemVariants} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}>
              <div
                className={`glass-card cursor-pointer bg-gradient-to-br ${stat.gradient} p-4 text-center transition-shadow hover:shadow-elevated`}
                onClick={() => navigate(`/my-tasks?filter=${stat.filter}`)}
              >
                <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="glass-card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                <TrendingUp size={16} className="text-primary" />
              </div>
              Overall Progress
            </h3>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion rate</span>
              <span className="font-semibold text-foreground">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              {completed.length} of {tasks.length} tasks completed
            </p>
          </div>
        </motion.div>

        {/* Weekly Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
          <div className="glass-card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                <BarChart3 size={16} className="text-primary" />
              </div>
              Weekly Activity
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--glass-bg))",
                      backdropFilter: "blur(16px)",
                      border: "1px solid hsl(var(--glass-border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === "completed" ? "Completed" : "Total",
                    ]}
                  />
                  <Bar dataKey="total" fill="hsl(var(--muted-foreground) / 0.2)" radius={[6, 6, 0, 0]} name="total" />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="completed" />
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
          </div>
        </motion.div>

        {/* Daily Productivity Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.33 }}
          className="mb-8"
        >
          <DailyProductivityScore
            completedToday={tasks.filter(t => t.completed && t.date === today).length}
            totalToday={tasks.filter(t => t.date === today).length}
            streak={streak.current}
          />
        </motion.div>

        {/* Smart Routine */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
          <SmartRoutine
            existingTasks={tasks.map(t => ({ title: t.title, date: t.date, time: t.time, completed: t.completed }))}
            onTaskAdded={fetchTasks}
          />
        </motion.div>

        {/* AI Suggestion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <AiSuggestion tip={aiSuggestion} loading={aiLoading} onRefresh={refreshAi} />
        </motion.div>

        {/* AI Rescheduled Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-8"
        >
          <div className="glass-card overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-amber-500/50 via-primary/40 to-secondary/30" />
            <div className="p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                  <RefreshCw size={16} className="text-primary" />
                </div>
                AI Rescheduled Tasks
                {rescheduledTasks.length > 0 && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-sm text-primary">{rescheduledTasks.length}</span>
                )}
              </h3>
              <div className="space-y-2">
                {rescheduledTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full glass">
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No rescheduled tasks</p>
                    <p className="text-xs text-muted-foreground/70">Overdue tasks will appear here when auto-rescheduled</p>
                  </div>
                ) : (
                  rescheduledTasks.map((t) => (
                    <div
                      key={t.id}
                      className="glass flex items-center justify-between rounded-xl px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Moved to {t.date}{t.time ? ` at ${t.time}` : ""} · Rescheduled {t.missedCount}×
                        </p>
                      </div>
                      <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        <RefreshCw size={12} />
                        {t.missedCount}×
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48 }}
          className="mb-8"
        >
          <div className="glass-card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/15">
                <StickyNote size={16} className="text-secondary" />
              </div>
              Quick Notes
            </h3>
            <div className="mb-3 flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Jot down a quick note..."
                rows={2}
                className="glass-input flex-1 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); }}}
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim()}
                className="glass self-end rounded-xl px-3 py-2 text-primary transition-all hover:bg-primary/20 disabled:opacity-40"
              >
                <Save size={18} />
              </button>
            </div>
            {quickNotes.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground/60">No notes yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {quickNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass flex items-start gap-2 rounded-xl px-3 py-2.5"
                  >
                    <p className="flex-1 text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate("/tasks")}
              className="group glass-card inline-flex items-center gap-3 bg-gradient-to-r from-primary/30 to-secondary/20 px-8 py-4 text-lg font-semibold text-foreground transition-all hover:scale-105"
            >
              <Plus className="h-6 w-6 text-primary" />
              Add Task
              <ChevronRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate("/my-tasks")}
              className="group glass-card inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold text-foreground transition-all hover:scale-105"
            >
              <ListTodo className="h-6 w-6 text-primary" />
              View Tasks
              <ChevronRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
