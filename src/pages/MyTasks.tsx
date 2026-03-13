import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowLeft, Filter, Settings, ArrowUpDown, Search,
  Plus, ListTodo, CheckCircle2, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Task, Category } from "@/types/task";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryColor } from "@/lib/categoryColors";
import { recordCompletion } from "@/lib/tasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TaskCard from "@/components/TaskCard";
import ProgressBar from "@/components/ProgressBar";
import TaskReminders from "@/components/TaskReminders";
import { useTaskReminders } from "@/hooks/useTaskReminders";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const MyTasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "category">("date");
  const [searchQuery, setSearchQuery] = useState("");
  const { allCategoryNames } = useCategories();

  // Quick-add FAB state
  const [fabOpen, setFabOpen] = useState(false);
  const [qTitle, setQTitle] = useState("");
  const [qDate, setQDate] = useState("");
  const [qTime, setQTime] = useState("");
  const [qPriority, setQPriority] = useState<Task["priority"]>("High");
  const [qCategory, setQCategory] = useState<string>("Assignment");
  const [qAdding, setQAdding] = useState(false);

  const quickAdd = async () => {
    if (!qTitle || !qDate || !user) {
      if (!qTitle) toast.error("Enter a task title");
      else if (!qDate) toast.error("Select a due date");
      return;
    }
    setQAdding(true);
    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: qTitle,
        date: qDate,
        time: qTime || null,
        priority: qPriority,
        category: qCategory,
      } as any);
      if (error) { toast.error("Failed to add task"); return; }
      toast.success("✅ Task added!");
      setQTitle("");
      setQDate("");
      setQTime("");
      setFabOpen(false);
      fetchTasks();
    } catch {
      toast.error("Failed to add task");
    } finally {
      setQAdding(false);
    }
  };

  const fetchTasks = useCallback(async () => {
    try {
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

      const mapped = (data || []).map((t) => ({
        id: t.id,
        title: t.title,
        date: t.date || tomorrowStr,
        time: t.time || null,
        priority: (t.priority as Task["priority"]) || "Medium",
        category: (t.category as Category) || "Other",
        completed: !!t.completed,
        note: (t as any).note || null,
        alarm_enabled: (t as any).alarm_enabled !== false,
        missedCount: (t as any).missed_count ?? 0,
      }));

      // Auto-reschedule overdue tasks with progressive delay
      const now = new Date();
      const overdue = mapped.filter((t) => {
        if (t.completed) return false;
        const taskDateTime = new Date(`${t.date}T${t.time || "00:00"}`);
        return taskDateTime < now;
      });

      if (overdue.length > 0) {
        const updates: Array<PromiseLike<any>> = [];

        for (const task of overdue) {
          const newMissedCount = task.missedCount + 1;
          // Immediate reschedule: move to 30 minutes from now
          const rescheduleTime = new Date();
          rescheduleTime.setMinutes(rescheduleTime.getMinutes() + 30);

          const newDate = rescheduleTime.toISOString().split("T")[0];
          const newTime = rescheduleTime.toTimeString().slice(0, 5);

          task.date = newDate;
          task.time = newTime;
          task.missedCount = newMissedCount;

          updates.push(
            supabase.from("tasks").update({
              date: newDate,
              time: newTime,
              missed_count: newMissedCount,
            } as any).eq("id", task.id).then(() => {})
          );
        }

        Promise.all(updates);

        const taskNames = overdue.slice(0, 3).map((t) => `"${t.title}" → ${t.time}`).join(", ");
        const extra = overdue.length > 3 ? ` +${overdue.length - 3} more` : "";

        toast.info(`🔄 ${overdue.length} missed task${overdue.length > 1 ? "s" : ""} rescheduled`, {
          description: `${taskNames}${extra}`,
          duration: 6000,
        });

        if (Notification.permission === "granted") {
          overdue.forEach((t) => {
            new Notification("Task Rescheduled", {
              body: `"${t.title}" moved to ${t.date} ${t.time}`,
              icon: "/pwa-192x192.png",
            });
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }

      const taskState: Task[] = mapped.map(({ missedCount, ...rest }) => rest);
      setTasks(taskState);
    } catch {
      toast.error("Something went wrong loading tasks");
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const completeTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").update({ completed: true }).eq("id", id);
      if (error) { toast.error("Failed to complete task"); return; }
      recordCompletion();
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, colors: ["#667eea", "#764ba2", "#36d1dc", "#5b86e5"] });
      } catch {}
      fetchTasks();
    } catch {}
  };

  const uncompleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").update({ completed: false }).eq("id", id);
      if (error) { toast.error("Failed to undo completion"); return; }
      fetchTasks();
    } catch {}
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) { toast.error("Failed to delete task"); return; }
      fetchTasks();
    } catch {}
  };

  const editTask = async (id: string, updates: { title: string; date: string; time: string | null; priority: string; category: string }) => {
    try {
      const { error } = await supabase.from("tasks").update(updates as any).eq("id", id);
      if (error) { toast.error("Failed to update task"); return; }
      toast.success("Task updated");
      fetchTasks();
    } catch {}
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
  const progressPercent = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-muted/80"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">My Tasks</h1>
          <button
            onClick={() => navigate("/tasks")}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:brightness-110"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 grid grid-cols-3 gap-3"
        >
          <div className="rounded-xl bg-card p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <ListTodo size={14} />
              <span className="text-xs">Pending</span>
            </div>
            <p className="mt-1 text-xl font-bold text-foreground">{tasks.filter(t => !t.completed).length}</p>
          </div>
          <div className="rounded-xl bg-card p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <CheckCircle2 size={14} />
              <span className="text-xs">Done</span>
            </div>
            <p className="mt-1 text-xl font-bold text-foreground">{tasks.filter(t => t.completed).length}</p>
          </div>
          <div className="rounded-xl bg-card p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <span className="text-xs">Progress</span>
            </div>
            <p className="mt-1 text-xl font-bold text-primary">{progressPercent}%</p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-5"
        >
          <Progress value={progressPercent} className="h-2" />
        </motion.div>

        {/* Search + Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 space-y-3"
        >
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            {["All", ...allCategoryNames].map((c) => {
              const color = c !== "All" ? getCategoryColor(c) : null;
              return (
                <button
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    filterCategory === c
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {color && <span className={`inline-block h-2 w-2 rounded-full ${color.dot}`} />}
                  {c}
                </button>
              );
            })}
            <button
              onClick={() => navigate("/categories")}
              className="rounded-full bg-muted p-1.5 text-muted-foreground transition-all hover:bg-muted/80"
              aria-label="Manage categories"
            >
              <Settings size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sort:</span>
            {(["date", "priority", "category"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-all ${
                  sortBy === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Reminders */}
        <TaskReminders dueToday={reminders.dueToday} dueTomorrow={reminders.dueTomorrow} />

        {/* Pending Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 space-y-3"
        >
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            📌 Pending Tasks
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">{pending.length}</span>
          </h2>
          <AnimatePresence>
            {pending.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 rounded-xl bg-card py-10 text-center shadow-sm"
              >
                <ListTodo size={40} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No pending tasks!</p>
                <button
                  onClick={() => navigate("/tasks")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
                >
                  <Plus size={14} /> Add a task
                </button>
              </motion.div>
            )}
            {pending.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task}
                index={i}
                onComplete={completeTask}
                onEdit={editTask}
                onDelete={deleteTask}
                allCategories={allCategoryNames}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Completed Tasks */}
        {completed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 space-y-3"
          >
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              ✅ Completed
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-sm text-green-600 dark:text-green-400">{completed.length}</span>
            </h2>
            <AnimatePresence>
              {completed.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  onComplete={completeTask}
                  onUncomplete={uncompleteTask}
                  onEdit={editTask}
                  onDelete={deleteTask}
                  allCategories={allCategoryNames}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* FAB + Quick Add Panel */}
      <AnimatePresence>
        {fabOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setFabOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-card p-5 shadow-elevated"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-foreground">Quick Add</h3>
                <button onClick={() => setFabOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                  placeholder="Task title..."
                  autoFocus
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={(e) => e.key === "Enter" && quickAdd()}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={qDate}
                    onChange={(e) => setQDate(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="time"
                    value={qTime}
                    onChange={(e) => setQTime(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={qPriority}
                    onChange={(e) => setQPriority(e.target.value as Task["priority"])}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                  <select
                    value={qCategory}
                    onChange={(e) => setQCategory(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {allCategoryNames.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={quickAdd}
                  disabled={qAdding}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 disabled:opacity-50"
                >
                  <Plus size={16} />
                  {qAdding ? "Adding..." : "Add Task"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setFabOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-all hover:scale-110"
        whileTap={{ scale: 0.9 }}
        aria-label="Quick add task"
      >
        <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={28} />
        </motion.div>
      </motion.button>
    </div>
  );
};

export default MyTasks;
