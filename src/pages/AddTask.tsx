import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, ArrowLeft, Eye, Bell, BellOff, Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Task, RepeatOption } from "@/types/task";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AddTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("High");
  const [category, setCategory] = useState<string>("Assignment");
  const { allCategoryNames } = useCategories();
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [alarmEnabled, setAlarmEnabled] = useState(true);

  const findNextFreeSlot = async (): Promise<string> => {
    const today = new Date().toISOString().split("T")[0];
    const targetDate = date || today;
    const { data } = await supabase
      .from("tasks")
      .select("time")
      .eq("user_id", user!.id)
      .eq("date", targetDate)
      .eq("completed", false);

    const taken = (data || []).map(t => t.time).filter(Boolean) as string[];
    const now = new Date();
    let minutes = targetDate === today
      ? Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 30) * 30
      : 8 * 60;

    for (let i = 0; i < 48; i++) {
      if (minutes >= 1380) break;
      const slot = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      if (!taken.includes(slot)) return slot;
      minutes += 30;
    }
    return "09:00";
  };

  const addTask = async () => {
    if (!title || !date || !user) {
      if (!title) toast.error("Please enter a task title");
      else if (!date) toast.error("Please select a due date");
      return;
    }
    setAdding(true);
    try {
      let taskTime = time || null;
      if (!taskTime) {
        taskTime = await findNextFreeSlot();
        toast.info(`⏰ Auto-scheduled at ${taskTime}`);
      }

      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title,
        date,
        time: taskTime,
        priority,
        category,
        note: note || null,
        alarm_enabled: alarmEnabled,
      } as any);
      if (error) {
        toast.error("Failed to add task");
        return;
      }
      toast.success("✅ Task added successfully!");
      setTitle("");
      setDate("");
      setTime("");
      setNote("");
      setAlarmEnabled(true);
    } catch {
      toast.error("Failed to add task");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="app-gradient-bg">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-transparent">
        <div className="container mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:scale-105"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">Add Task</h1>
          <button
            onClick={() => navigate("/my-tasks")}
            className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/25"
          >
            <Eye size={16} />
            View Tasks
          </button>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl glass bg-primary/15">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Create a New Task</h2>
          <p className="mt-1 text-sm text-muted-foreground">Fill in the details and hit add</p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-card p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Task Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Study for midterms, Submit assignment..."
                className="glass-input w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Due Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Time (optional)</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Alarm Toggle */}
            {time && (
              <div className="glass flex items-center justify-between rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${alarmEnabled ? "bg-primary/15" : "glass"}`}>
                    {alarmEnabled ? <Bell size={18} className="text-primary" /> : <BellOff size={18} className="text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Alarm & Reminder</p>
                    <p className="text-xs text-muted-foreground">
                      {alarmEnabled ? "You'll be notified at the scheduled time" : "No alarm for this task"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAlarmEnabled(!alarmEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    alarmEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${
                      alarmEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Priority & Category Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task["priority"])}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="High">🔴 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {allCategoryNames.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any details or reminders..."
                rows={2}
                className="glass-input w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={addTask}
              disabled={adding}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-elevated transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50"
            >
              <Plus size={20} />
              {adding ? "Adding..." : "Add Task"}
            </button>
          </div>
        </motion.div>

        {/* Quick Nav */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => navigate("/my-tasks")}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-all hover:underline"
          >
            <Eye size={16} />
            View all your tasks →
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default AddTask;
