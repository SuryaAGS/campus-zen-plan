import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Plus, GraduationCap, ArrowDown, Filter, Moon, Sun, LogOut, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import mascot from "@/assets/mascot.png";
import { Task, CATEGORIES, Category } from "@/types/task";
import { getAiSuggestion, refreshStreak, recordCompletion, StreakData } from "@/lib/tasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TaskCard from "@/components/TaskCard";
import ProgressBar from "@/components/ProgressBar";
import AiSuggestion from "@/components/AiSuggestion";
import StreakBadge from "@/components/StreakBadge";
import { toast } from "sonner";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("High");
  const [category, setCategory] = useState<Category>("Assignment");
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
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
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
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
      priority,
      category,
    });
    if (error) {
      toast.error("Failed to add task");
      return;
    }
    setTitle("");
    setDate("");
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

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete task");
      return;
    }
    fetchTasks();
  };

  const filtered = filterCategory === "All" ? tasks : tasks.filter((t) => t.category === filterCategory);
  const pending = filtered.filter((t) => !t.completed);
  const completed = filtered.filter((t) => t.completed);

  const scrollToApp = () => {
    appRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      {/* Top Controls */}
      <div className="fixed right-4 top-4 z-50 flex gap-2">
        <button
          onClick={() => navigate("/profile")}
          className="rounded-full bg-card p-3 shadow-elevated transition-all hover:scale-110"
          aria-label="Profile"
        >
          <UserCircle size={20} className="text-foreground" />
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
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="High">🔴 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </div>
              <div className="min-w-[130px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button onClick={addTask} className="gradient-bg flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:shadow-elevated hover:brightness-110">
                <Plus size={16} /> Add
              </button>
            </div>
          </motion.div>

          {/* Filter Bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-primary-foreground/70" />
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  filterCategory === c
                    ? "bg-card text-foreground shadow-card"
                    : "bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Tasks */}
          <div className="mb-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-primary-foreground">📌 Tasks ({pending.length})</h2>
            <AnimatePresence>
              {pending.length === 0 && <p className="text-sm text-primary-foreground/60">No pending tasks. Add one above!</p>}
              {pending.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} onComplete={completeTask} onDelete={deleteTask} />
              ))}
            </AnimatePresence>
          </div>

          {/* Completed */}
          {completed.length > 0 && (
            <div className="mb-6 space-y-3">
              <h2 className="font-display text-lg font-semibold text-primary-foreground">✅ Completed ({completed.length})</h2>
              <AnimatePresence>
                {completed.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} onComplete={completeTask} onDelete={deleteTask} />
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
