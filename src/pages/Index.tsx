import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, GraduationCap } from "lucide-react";
import mascot from "@/assets/mascot.png";
import { Task } from "@/types/task";
import { loadTasks, saveTasks, getAiSuggestion, autoReschedule } from "@/lib/tasks";
import TaskCard from "@/components/TaskCard";
import ProgressBar from "@/components/ProgressBar";
import AiSuggestion from "@/components/AiSuggestion";

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("High");

  useEffect(() => {
    const loaded = autoReschedule(loadTasks());
    setTasks(loaded);
    saveTasks(loaded);
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
      completed: false,
    };
    persist([...tasks, newTask]);
    setTitle("");
    setDate("");
  };

  const completeTask = (id: string) => persist(tasks.map((t) => (t.id === id ? { ...t, completed: true } : t)));
  const deleteTask = (id: string) => persist(tasks.filter((t) => t.id !== id));

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <GraduationCap size={36} className="text-primary-foreground" />
            <h1 className="font-display text-4xl font-bold text-primary-foreground">
              CollegeMate
            </h1>
          </div>
          <img src={mascot} alt="CollegeMate mascot" className="mx-auto mb-3 h-32 w-32 drop-shadow-lg" />
          <p className="text-lg text-primary-foreground/80">
            Smart AI-powered student productivity
          </p>
        </motion.div>

        {/* Add Task Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 rounded-xl bg-card p-5 shadow-elevated"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Task</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Study for midterms"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
            </div>
            <div className="min-w-[150px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="min-w-[110px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>
            <button
              onClick={addTask}
              className="gradient-bg flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:shadow-elevated hover:brightness-110"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </motion.div>

        {/* Tasks */}
        <div className="mb-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-primary-foreground">
            📌 Tasks ({pending.length})
          </h2>
          <AnimatePresence>
            {pending.length === 0 && (
              <p className="text-sm text-primary-foreground/60">No pending tasks. Add one above!</p>
            )}
            {pending.map((task, i) => (
              <TaskCard key={task.id} task={task} index={i} onComplete={completeTask} onDelete={deleteTask} />
            ))}
          </AnimatePresence>
        </div>

        {/* Completed */}
        {completed.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-primary-foreground">
              ✅ Completed ({completed.length})
            </h2>
            <AnimatePresence>
              {completed.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} onComplete={completeTask} onDelete={deleteTask} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Progress & AI */}
        <div className="space-y-4">
          <ProgressBar completed={completed.length} total={tasks.length} />
          <AiSuggestion tip={getAiSuggestion(tasks)} />
        </div>
      </div>
    </div>
  );
};

export default Index;
