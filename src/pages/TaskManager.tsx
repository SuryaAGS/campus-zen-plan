import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { 
  Plus, ArrowLeft, Filter, Settings, ArrowUpDown, Search, 
  LayoutDashboard
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Task, Category } from "@/types/task";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryColor } from "@/lib/categoryColors";
import { refreshStreak, recordCompletion } from "@/lib/tasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TaskCard from "@/components/TaskCard";
import ProgressBar from "@/components/ProgressBar";
import TaskReminders from "@/components/TaskReminders";
import { useTaskReminders } from "@/hooks/useTaskReminders";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TaskManager = () => {
  const { user } = useAuth();
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

      const mapped: Task[] = (data || []).map((t) => ({
        id: t.id,
        title: t.title,
        date: t.date || tomorrowStr,
        time: t.time || null,
        priority: (t.priority as Task["priority"]) || "Medium",
        category: (t.category as Category) || "Other",
        completed: !!t.completed,
      }));

      // Auto-reschedule overdue tasks (time-aware: 3 hours ahead)
      const now = new Date();
      const overdue = mapped.filter((t) => {
        if (t.completed) return false;
        const taskDateTime = new Date(`${t.date}T${t.time || "00:00"}`);
        return taskDateTime < now;
      });

      if (overdue.length > 0) {
        const rescheduleTime = new Date();
        rescheduleTime.setHours(rescheduleTime.getHours() + 3);
        const newDate = rescheduleTime.toISOString().split("T")[0];
        const newTime = rescheduleTime.toTimeString().slice(0, 5);

        const taskNames = overdue.slice(0, 3).map((t) => `"${t.title}"`).join(", ");
        const extra = overdue.length > 3 ? ` and ${overdue.length - 3} more` : "";

        for (const task of overdue) {
          task.date = newDate;
          task.time = newTime;
        }

        // Batch update in DB
        Promise.all(
          overdue.map((t) =>
            supabase.from("tasks").update({ date: newDate, time: newTime }).eq("id", t.id)
          )
        );

        toast.info(`🔄 ${overdue.length} missed task${overdue.length > 1 ? "s" : ""} rescheduled to ${newTime}`, {
          description: `${taskNames}${extra}`,
          duration: 6000,
        });

        // Browser push notification
        if (Notification.permission === "granted") {
          overdue.forEach((t) => {
            new Notification("Task Rescheduled", {
              body: `"${t.title}" moved to ${newTime}`,
              icon: "/pwa-192x192.png",
            });
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }

      setTasks(mapped);
    } catch (err) {
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
        toast.error("Failed to add task");
        return;
      }
      toast.success("Task added!");
      setTitle("");
      setDate("");
      setTime("");
      fetchTasks();
    } catch {
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
      recordCompletion();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
          colors: ["#667eea", "#764ba2", "#36d1dc", "#5b86e5"],
        });
      } catch {}
      fetchTasks();
    } catch {}
  };

  const uncompleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").update({ completed: false }).eq("id", id);
      if (error) {
        toast.error("Failed to undo completion");
        return;
      }
      fetchTasks();
    } catch {}
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete task");
        return;
      }
      fetchTasks();
    } catch {}
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
          <h1 className="font-display text-xl font-bold text-foreground">Task Manager</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-full bg-primary/10 p-2 text-primary transition-all hover:bg-primary/20"
          >
            <LayoutDashboard size={18} />
          </button>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        {/* Add Task Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-6 border-none shadow-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-primary" />
                Add New Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
                <div className="sm:col-span-2 lg:flex-1 lg:min-w-[180px]">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Task</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Study for midterms"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Due Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task["priority"])}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {allCategoryNames.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <button
                    onClick={addTask}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:brightness-110 lg:w-auto"
                  >
                    <Plus size={16} /> Add Task
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search + Filter Bar */}
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
            📌 Tasks
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">{pending.length}</span>
          </h2>
          <AnimatePresence>
            {pending.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending tasks. Add one above!</p>
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

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ProgressBar completed={completed.length} total={tasks.length} />
        </motion.div>
      </div>
    </div>
  );
};

export default TaskManager;
