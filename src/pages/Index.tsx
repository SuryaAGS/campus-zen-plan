import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Plus, ClipboardCheck, ArrowDown, Filter, Moon, Sun, LogOut, UserCircle, Settings, CalendarDays, ArrowUpDown, Search, Download, Bell, MessageSquare } from "lucide-react";
import FeedbackDialog from "@/components/FeedbackDialog";
import { useNavigate } from "react-router-dom";
import appIcon from "@/assets/app-icon.png";
import { Task, Category } from "@/types/task";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryColor } from "@/lib/categoryColors";
import { refreshStreak, recordCompletion, StreakData } from "@/lib/tasks";
import { useAiSuggestion } from "@/hooks/useAiSuggestion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TaskCard from "@/components/TaskCard";
import ProgressBar from "@/components/ProgressBar";
import AiSuggestion from "@/components/AiSuggestion";
import StreakBadge from "@/components/StreakBadge";
import TaskReminders from "@/components/TaskReminders";
import { useTaskReminders } from "@/hooks/useTaskReminders";
import { toast } from "sonner";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("High");
  const [category, setCategory] = useState<string>("Assignment");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "category">("date");
  const [searchQuery, setSearchQuery] = useState("");
  const { allCategoryNames } = useCategories();
  const [streak, setStreak] = useState<StreakData>({ current: 0, lastCompletionDate: null });
  const [dark, setDark] = useState(() => localStorage.getItem("taskstodo-dark") === "true");
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null });
  const appRef = useRef<HTMLDivElement>(null);

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
          // Fall back to auth user metadata (e.g. Google OAuth)
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

  // Load tasks from Supabase
  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("fetchTasks error:", error);
        toast.error("Failed to load tasks");
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
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
        note: (t as any).note || null,
      }));

      // Auto-reschedule overdue tasks immediately (30 min from now)
      const now = new Date();
      const overdue = mapped.filter((t) => !t.completed && new Date(`${t.date}T${t.time || "00:00"}`) < now);
      if (overdue.length > 0) {
        const rescheduleTime = new Date();
        rescheduleTime.setMinutes(rescheduleTime.getMinutes() + 30);
        const newDate = rescheduleTime.toISOString().split("T")[0];
        const newTime = rescheduleTime.toTimeString().slice(0, 5);
        const taskNames = overdue.slice(0, 3).map((t) => `"${t.title}"`).join(", ");
        const extra = overdue.length > 3 ? ` and ${overdue.length - 3} more` : "";
        for (const task of overdue) {
          task.date = newDate;
          task.time = newTime;
        }
        supabase
          .from("tasks")
          .update({ date: newDate, time: newTime } as any)
          .in("id", overdue.map((t) => t.id))
          .then(() => {});
        toast.info(`🔄 ${overdue.length} overdue task${overdue.length > 1 ? "s" : ""} rescheduled`, {
          description: `${taskNames}${extra} → ${newTime}`,
          duration: 6000,
        });
      }

      setTasks(mapped);
      setStreak(refreshStreak());
    } catch (err) {
      console.error("fetchTasks unexpected error:", err);
      toast.error("Something went wrong loading tasks");
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async () => {
    if (!title || !date || !user) return;
    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title,
        date,
        time: time || null,
        priority,
        category,
      } as any);
      if (error) {
        console.error("addTask error:", error);
        toast.error("Failed to add task");
        return;
      }
      setTitle("");
      setDate("");
      setTime("");
      fetchTasks();
    } catch (err) {
      console.error("addTask unexpected error:", err);
      toast.error("Failed to add task");
    }
  };

  const completeTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").update({ completed: true }).eq("id", id);
      if (error) {
        toast.error("Failed to complete task");
        return;
      }
      setStreak(recordCompletion());
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
          colors: ["#667eea", "#764ba2", "#36d1dc", "#5b86e5"],
        });
      } catch (_) {}
      fetchTasks();
    } catch (err) {
      console.error("completeTask error:", err);
    }
  };

  const uncompleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").update({ completed: false }).eq("id", id);
      if (error) {
        toast.error("Failed to undo completion");
        return;
      }
      fetchTasks();
    } catch (err) {
      console.error("uncompleteTask error:", err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete task");
        return;
      }
      fetchTasks();
    } catch (err) {
      console.error("deleteTask error:", err);
    }
  };

  const editTask = async (id: string, updates: { title: string; date: string; time: string | null; priority: string; category: string }) => {
    try {
      const { error } = await supabase.from("tasks").update(updates as any).eq("id", id);
      if (error) {
        toast.error("Failed to update task");
        return;
      }
      toast.success("Task updated");
      fetchTasks();
    } catch (err) {
      console.error("editTask error:", err);
    }
  };

  const { suggestion: aiSuggestion, loading: aiLoading, refresh: refreshAi } = useAiSuggestion(tasks.length);
  const reminders = useTaskReminders(tasks);
  const filtered = (filterCategory === "All" ? tasks : tasks.filter((t) => t.category === filterCategory))
    .filter((t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
  const sortTasks = (list: Task[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === "date") return a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "");
      if (sortBy === "priority") return priorityOrder[a.priority] - priorityOrder[b.priority];
      return a.category.localeCompare(b.category);
    });
  };

  const pending = sortTasks(filtered.filter((t) => !t.completed));
  const completed = sortTasks(filtered.filter((t) => t.completed));

  const scrollToApp = () => {
    appRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
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

      {/* Landing Hero */}
      <section className="gradient-bg flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
           <div className="mb-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
             <ClipboardCheck size={36} className="text-primary-foreground sm:size-12" />
             <h1 className="font-display text-3xl font-bold text-primary-foreground sm:text-5xl md:text-6xl">
               Tasks To Do
             </h1>
           </div>
           <p className="mx-auto mb-6 max-w-lg text-base text-primary-foreground/80 sm:mb-8 md:text-xl">
             Your smart daily task manager with AI-powered suggestions,
             automatic reminders, and productivity tracking.
           </p>
           <img src={appIcon} alt="Tasks To Do icon" className="mx-auto mb-8 h-32 w-32 drop-shadow-2xl sm:mb-10 sm:h-44 sm:w-44 md:h-52 md:w-52" />
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-full bg-card px-8 py-3 text-base font-semibold text-foreground shadow-elevated transition-all hover:scale-105 hover:shadow-card sm:text-lg"
            >
              Start Planning
              <ArrowDown size={20} />
            </button>
            <button
              onClick={() => navigate("/install")}
              className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 hover:bg-primary-foreground/30"
            >
              <Download size={16} /> Install App
            </button>
          </div>
        </motion.div>
      </section>

      {/* App Section */}
      <div ref={appRef} className="gradient-bg min-h-screen">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 text-center">
             <div className="mb-4 flex items-center justify-center gap-3">
               <ClipboardCheck size={36} className="text-primary-foreground" />
               <h2 className="font-display text-4xl font-bold text-primary-foreground">Tasks To Do</h2>
             </div>
             <p className="text-lg text-primary-foreground/80">Smart AI-powered daily productivity</p>
          </motion.div>

          {/* Add Task Form */}
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6 rounded-xl bg-card p-4 shadow-elevated sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
              <div className="sm:col-span-2 lg:flex-1 lg:min-w-[180px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Task</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Study for midterms" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" onKeyDown={(e) => e.key === "Enter" && addTask()} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Due Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="High">🔴 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {allCategoryNames.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <button onClick={addTask} className="gradient-bg flex w-full items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:shadow-elevated hover:brightness-110 lg:w-auto">
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          </motion.div>

          {/* Search + Filter Bar */}
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full rounded-full border border-input bg-card pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-primary-foreground/70" />
            {["All", ...allCategoryNames].map((c) => {
              const color = c !== "All" ? getCategoryColor(c) : null;
              return (
                <button
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    filterCategory === c
                      ? "bg-card text-foreground shadow-card"
                      : "bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20"
                  }`}
                >
                  {color && <span className={`inline-block h-2 w-2 rounded-full ${color.dot}`} />}
                  {c}
                </button>
              );
            })}
            <button
              onClick={() => navigate("/categories")}
              className="rounded-full bg-primary-foreground/10 p-1.5 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20"
              aria-label="Manage categories"
            >
              <Settings size={14} />
            </button>
          </div>

          {/* Sort Bar */}
          <div className="mb-4 flex items-center gap-2">
            <ArrowUpDown size={14} className="text-primary-foreground/70" />
            <span className="text-xs text-primary-foreground/70">Sort:</span>
            {(["date", "priority", "category"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-all ${
                  sortBy === s
                    ? "bg-card text-foreground shadow-card"
                    : "bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Reminders */}
          <TaskReminders dueToday={reminders.dueToday} dueTomorrow={reminders.dueTomorrow} />

          {/* Tasks */}
          <div className="mb-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-primary-foreground">📌 Tasks ({pending.length})</h2>
            <AnimatePresence>
              {pending.length === 0 && <p className="text-sm text-primary-foreground/60">No pending tasks. Add one above!</p>}
              {pending.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} onComplete={completeTask} onEdit={editTask} onDelete={deleteTask} allCategories={allCategoryNames} />
              ))}
            </AnimatePresence>
          </div>

          {/* Completed */}
          {completed.length > 0 && (
            <div className="mb-6 space-y-3">
              <h2 className="font-display text-lg font-semibold text-primary-foreground">✅ Completed ({completed.length})</h2>
              <AnimatePresence>
                {completed.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} onComplete={completeTask} onUncomplete={uncompleteTask} onEdit={editTask} onDelete={deleteTask} allCategories={allCategoryNames} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Progress, Streak & AI */}
          <div className="space-y-4">
            <StreakBadge streak={streak.current} />
            <ProgressBar completed={completed.length} total={tasks.length} />
            <AiSuggestion tip={aiSuggestion} loading={aiLoading} onRefresh={refreshAi} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
