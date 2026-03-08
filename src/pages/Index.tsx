import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, GraduationCap, ArrowDown, Filter } from "lucide-react";
import mascot from "@/assets/mascot.png";
import { Task, CATEGORIES, Category } from "@/types/task";
import { loadTasks, saveTasks, getAiSuggestion, autoReschedule, refreshStreak, recordCompletion, StreakData } from "@/lib/tasks";
import TaskCard from "@/components/TaskCard";
import ProgressBar from "@/components/ProgressBar";
import AiSuggestion from "@/components/AiSuggestion";
import StreakBadge from "@/components/StreakBadge";

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("High");
  const [category, setCategory] = useState<Category>("Assignment");
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [streak, setStreak] = useState<StreakData>({ current: 0, lastCompletionDate: null });
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = autoReschedule(loadTasks());
    setTasks(loaded);
    saveTasks(loaded);
    setStreak(refreshStreak());
  }, []);

  const persist = useCallback((updated: Task[]) => {
    setTasks(updated);
    saveTasks(updated);
  }, []);

  const addTask = () => {
    if (!title || !date) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      date,
      priority,
      category,
      completed: false,
    };
    persist([...tasks, newTask]);
    setTitle("");
    setDate("");
  };

  const completeTask = (id: string) => {
    persist(tasks.map((t) => (t.id === id ? { ...t, completed: true } : t)));
    setStreak(recordCompletion());
  };
  const deleteTask = (id: string) => persist(tasks.filter((t) => t.id !== id));

  const filtered = filterCategory === "All" ? tasks : tasks.filter((t) => t.category === filterCategory);
  const pending = filtered.filter((t) => !t.completed);
  const completed = filtered.filter((t) => t.completed);

  const scrollToApp = () => {
    appRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
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
