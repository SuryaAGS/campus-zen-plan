import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Plus, GraduationCap, ArrowDown, Filter, Moon, Sun, LogOut, UserCircle, Settings, CalendarDays, ArrowUpDown, Search, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import mascot from "@/assets/mascot.png";
import { Task, Category } from "@/types/task";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryColor } from "@/lib/categoryColors";
import { getAiSuggestion, refreshStreak, recordCompletion, StreakData } from "@/lib/tasks";
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
  const [dark, setDark] = useState(() => localStorage.getItem("collegemate-dark") === "true");
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
    localStorage.setItem("collegemate-dark", String(dark));
  }, [dark]);

  // Load tasks from Supabase
  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load tasks");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const mapped: Task[] = [];
    for (const t of data || []) {
      const task: Task = {
        id: t.id,
        title: t.title,
        date: t.date,
        time: (t as any).time || null,
        priority: t.priority as Task["priority"],
        category: t.category as Category,
        completed: t.completed,
      };
      if (!task.completed && new Date(task.date) < today) {
        task.date = tomorrowStr;
        await supabase.from("tasks").update({ date: tomorrowStr }).eq("id", task.id);
      }
      mapped.push(task);
    }

    setTasks(mapped);
    setStreak(refreshStreak());
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async () => {
    if (!title || !date || !user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title,
      date,
      time: time || null,
      priority,
      category,
    } as any);
    if (error) {
      toast.error("Failed to add task");
      return;
    }
    setTitle("");
    setDate("");
    setTime("");
    fetchTasks();
  };

  const completeTask = async (id: string) => {
    const { error } = await supabase.from("tasks").update({ completed: true }).eq("id", id);
    if (error) {
      toast.error("Failed to complete task");
      return;
    }
    setStreak(recordCompletion());
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#667eea", "#764ba2", "#36d1dc", "#5b86e5"],
    });
    fetchTasks();
  };

  const uncompleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").update({ completed: false }).eq("id", id);
    if (error) {
      toast.error("Failed to undo completion");
      return;
    }
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete task");
      return;
    }
    fetchTasks();
  };

  const editTask = async (id: string, updates: { title: string; date: string; time: string | null; priority: string; category: string }) => {
    const { error } = await supabase.from("tasks").update(updates as any).eq("id", id);
    if (error) {
      toast.error("Failed to update task");
      return;
    }
    toast.success("Task updated");
    fetchTasks();
  };

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
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
        <button
          onClick={() => navigate("/calendar")}
          className="rounded-full bg-card p-3 shadow-elevated transition-all hover:scale-110"
          aria-label="Calendar view"
        >
          <CalendarDays size={20} className="text-foreground" />
        </button>
        <button
          onClick={() => setDark((d) => !d)}
          className="rounded-full bg-card p-3 shadow-elevated transition-all hover:scale-110"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun size={20} className="text-foreground" /> : <Moon size={20} className="text-foreground" />}
        </button>
        <button
          onClick={signOut}
          className="rounded-full bg-card p-3 shadow-elevated transition-all hover:scale-110"
          aria-label="Sign out"
        >
          <LogOut size={20} className="text-foreground" />
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
          <div className="mb-6 flex items-center justify-center gap-3">
            <GraduationCap size={48} className="text-primary-foreground" />
            <h1 className="font-display text-5xl font-bold text-primary-foreground md:text-6xl">
              CollegeMate AI Planner
            </h1>
          </div>
          <p className="mx-auto mb-8 max-w-lg text-lg text-primary-foreground/80 md:text-xl">
            The smart AI-powered planner that automatically organizes your tasks,
            reschedules missed work, and boosts your productivity.
          </p>
          <img src={mascot} alt="CollegeMate mascot" className="mx-auto mb-10 h-44 w-44 drop-shadow-2xl md:h-52 md:w-52" />
          <button
            onClick={scrollToApp}
            className="inline-flex items-center gap-2 rounded-full bg-card px-8 py-3 text-lg font-semibold text-foreground shadow-elevated transition-all hover:scale-105 hover:shadow-card"
          >
            Start Planning
            <ArrowDown size={20} />
          </button>
        </motion.div>
      </section>

      {/* App Section */}
      <div ref={appRef} className="gradient-bg min-h-screen">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <GraduationCap size={36} className="text-primary-foreground" />
              <h2 className="font-display text-4xl font-bold text-primary-foreground">CollegeMate</h2>
            </div>
            <p className="text-lg text-primary-foreground/80">Smart AI-powered student productivity</p>
          </motion.div>

          {/* Add Task Form */}
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6 rounded-xl bg-card p-5 shadow-elevated">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Task</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Study for midterms" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" onKeyDown={(e) => e.key === "Enter" && addTask()} />
              </div>
              <div className="min-w-[150px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Due Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="min-w-[110px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="min-w-[110px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="High">🔴 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </div>
              <div className="min-w-[130px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {allCategoryNames.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button onClick={addTask} className="gradient-bg flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:shadow-elevated hover:brightness-110">
                <Plus size={16} /> Add
              </button>
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
            <AiSuggestion tip={getAiSuggestion(tasks)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
