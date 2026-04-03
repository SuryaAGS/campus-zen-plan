import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Moon, Sun, LogOut, UserCircle, CalendarDays,
  Bell, ListTodo, TrendingUp, Target, Clock, CheckCircle2,
  Plus, RefreshCw, StickyNote, Save, X, Eye, EyeOff, Flame
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import FeedbackDialog from "@/components/FeedbackDialog";
import appIcon from "@/assets/app-icon.png";
import { Task, Category } from "@/types/task";
import { refreshStreak, recordCompletion, StreakData } from "@/lib/tasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { useAiSuggestion } from "@/hooks/useAiSuggestion";
import TodayFocus from "@/components/TodayFocus";
import CollapsibleAiPanel from "@/components/CollapsibleAiPanel";
import confetti from "canvas-confetti";
import { toast } from "sonner";

// Lazy load secondary sections
const AiSuggestion = lazy(() => import("@/components/AiSuggestion"));
const SmartRoutine = lazy(() => import("@/components/SmartRoutine"));
const DailyProductivityScore = lazy(() => import("@/components/DailyProductivityScore"));
const WeeklyChart = lazy(() => import("@/components/WeeklyChart"));

const MOTIVATIONAL_LINES = [
  "Make today count. One task at a time.",
  "Small steps lead to big achievements.",
  "Focus on progress, not perfection.",
  "You're closer than you think.",
  "Discipline is the bridge to your goals.",
  "Every completed task is a victory.",
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getMotivation(): string {
  const idx = new Date().getDate() % MOTIVATIONAL_LINES.length;
  return MOTIVATIONAL_LINES[idx];
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rawTasks, setRawTasks] = useState<Array<{ date: string; completed: boolean }>>([]);
  const [streak, setStreak] = useState<StreakData>({ current: 0, lastCompletionDate: null });
  const [dark, setDark] = useState(() => localStorage.getItem("taskstodo-dark") === "true");
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null });
  const [rescheduledTasks, setRescheduledTasks] = useState<Array<{ id: string; title: string; date: string; time: string | null; missedCount: number }>>([]);
  const [focusMode, setFocusMode] = useState(false);

  // Quick Notes state
  const [quickNotes, setQuickNotes] = useState<Array<{ id: string; text: string; created: string }>>(() => {
    try { return JSON.parse(localStorage.getItem("taskstodo-quick-notes") || "[]"); } catch { return []; }
  });
  const [newNote, setNewNote] = useState("");

  const saveNotes = useCallback((notes: typeof quickNotes) => {
    setQuickNotes(notes);
    localStorage.setItem("taskstodo-quick-notes", JSON.stringify(notes));
  }, []);

  const addNote = useCallback(() => {
    if (!newNote.trim()) return;
    saveNotes([{ id: crypto.randomUUID(), text: newNote.trim(), created: new Date().toISOString() }, ...quickNotes]);
    setNewNote("");
  }, [newNote, quickNotes, saveNotes]);

  const deleteNote = useCallback((id: string) => saveNotes(quickNotes.filter(n => n.id !== id)), [quickNotes, saveNotes]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data);
        else {
          const meta = user.user_metadata;
          setProfile({ display_name: meta?.full_name || meta?.display_name || meta?.name || null, avatar_url: meta?.avatar_url || meta?.picture || null });
        }
      });
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("taskstodo-dark", String(dark));
  }, [dark]);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: true });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const mapped = (data || []).map((t) => ({
      id: t.id, title: t.title, date: t.date || tomorrowStr, time: t.time || null,
      priority: (t.priority as Task["priority"]) || "Medium",
      category: (t.category as Category) || "Other",
      completed: !!t.completed,
      alarm_enabled: (t as any).alarm_enabled !== false,
      note: (t as any).note || null,
      missedCount: (t as any).missed_count ?? 0,
    }));

    setRawTasks((data || []).map((t) => ({ date: t.date || tomorrowStr, completed: !!t.completed })));
    setRescheduledTasks(mapped.filter((t) => !t.completed && t.missedCount > 0));
    setTasks(mapped.map(({ missedCount, ...rest }) => rest));
    setStreak(refreshStreak());
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const completeTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").update({ completed: true }).eq("id", id);
    if (error) { toast.error("Failed to complete task"); return; }
    setStreak(recordCompletion());
    try { confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 }, colors: ["#667eea", "#764ba2", "#36d1dc"] }); } catch {}
    fetchTasks();
  }, [fetchTasks]);

  const pending = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const completed = useMemo(() => tasks.filter((t) => t.completed), [tasks]);
  const today = new Date().toISOString().split("T")[0];
  const dueToday = useMemo(() => pending.filter((t) => t.date === today), [pending, today]);
  const highPriority = useMemo(() => pending.filter((t) => t.priority === "High"), [pending]);
  const progressPercent = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
  const completedToday = useMemo(() => tasks.filter(t => t.completed && t.date === today).length, [tasks, today]);
  const totalToday = useMemo(() => tasks.filter(t => t.date === today).length, [tasks, today]);

  const firstName = profile.display_name?.split(" ")[0] || "";

  const LazySection = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<div className="glass-card-lite animate-pulse h-24 rounded-xl" />}>{children}</Suspense>
  );

  return (
    <div className="app-gradient-bg">
      {/* Profile - Left */}
      <button onClick={() => navigate("/profile")} className="fixed left-3 top-3 z-50 flex items-center gap-1.5 glass rounded-full px-3 py-1.5 transition-colors hover:bg-primary/10" aria-label="Profile">
        {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="h-5 w-5 rounded-full object-cover" /> : <UserCircle size={16} className="text-foreground" />}
        {profile.display_name && <span className="max-w-[90px] truncate text-xs font-medium text-foreground">{profile.display_name}</span>}
      </button>

      {/* Controls - Right */}
      <div className="fixed right-2 top-2 z-50 flex items-center gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
        <FeedbackDialog />
        <button onClick={() => navigate("/notifications")} className="glass rounded-full p-2 transition-colors hover:bg-primary/10 sm:p-3" aria-label="Notifications"><Bell size={18} className="text-foreground sm:size-5" /></button>
        <button onClick={() => navigate("/calendar")} className="glass rounded-full p-2 transition-colors hover:bg-primary/10 sm:p-3" aria-label="Calendar"><CalendarDays size={18} className="text-foreground sm:size-5" /></button>
        <button onClick={() => setDark((d) => !d)} className="glass rounded-full p-2 transition-colors hover:bg-primary/10 sm:p-3" aria-label="Toggle dark mode">
          {dark ? <Sun size={18} className="text-foreground sm:size-5" /> : <Moon size={18} className="text-foreground sm:size-5" />}
        </button>
        <button onClick={signOut} className="glass rounded-full p-2 transition-colors hover:bg-primary/10 sm:p-3" aria-label="Sign out"><LogOut size={18} className="text-foreground sm:size-5" /></button>
      </div>

      <div className="container mx-auto max-w-lg px-4 pb-28 pt-16">
        {/* ─── Header: Greeting + Date + Motivation ─── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <img src={appIcon} alt="Tasks To Do" className="h-10 w-10 drop-shadow-md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {getGreeting()}{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="text-xs text-muted-foreground">{formatDate()}</p>
            </div>
          </div>
          <p className="mt-2 text-sm italic text-muted-foreground/80">"{getMotivation()}"</p>
          <div className="mt-3 flex items-center gap-3">
            {streak.current > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                <Flame size={12} /> {streak.current} day streak
              </span>
            )}
            <button
              onClick={() => setFocusMode((f) => !f)}
              className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                focusMode ? "bg-primary/20 text-primary" : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {focusMode ? <EyeOff size={12} /> : <Eye size={12} />}
              {focusMode ? "Focus On" : "Focus Mode"}
            </button>
          </div>
        </div>

        {/* ─── Today Focus ─── */}
        <div className="mb-5">
          <TodayFocus tasks={tasks} onComplete={completeTask} onViewAll={() => navigate("/my-tasks?filter=today")} />
        </div>

        {/* ─── Quick Summary Cards ─── */}
        {!focusMode && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { label: "Pending", value: pending.length, icon: ListTodo, color: "text-primary", bg: "bg-primary/10", filter: "pending" },
                { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", filter: "completed" },
                { label: "Due Today", value: dueToday.length, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", filter: "today" },
                { label: "High Priority", value: highPriority.length, icon: Target, color: "text-destructive", bg: "bg-destructive/10", filter: "high" },
              ].map((s) => (
                <button
                  key={s.filter}
                  onClick={() => navigate(`/my-tasks?filter=${s.filter}`)}
                  className="glass-card-lite flex min-w-[5.5rem] shrink-0 flex-col items-center gap-1 px-3 py-3 transition-shadow hover:shadow-card"
                >
                  <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${s.bg}`}>
                    <s.icon size={14} className={s.color} />
                  </div>
                  <span className="text-lg font-bold text-foreground">{s.value}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
        )}

        {/* ─── Quick Actions ─── */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/tasks")}
            className="glass-card group flex items-center gap-3 bg-gradient-to-br from-primary/15 to-primary/5 px-4 py-3.5 transition-shadow hover:shadow-elevated"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
              <Plus size={18} className="text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Add Task</span>
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("quick-notes-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="glass-card group flex items-center gap-3 bg-gradient-to-br from-secondary/15 to-secondary/5 px-4 py-3.5 transition-shadow hover:shadow-elevated"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/20">
              <StickyNote size={18} className="text-secondary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Quick Notes</span>
          </button>
        </div>

        {/* ─── Progress (Compact) ─── */}
        {!focusMode && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.2 }} className="mb-5">
            <div className="glass-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                    <TrendingUp size={14} className="text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Overall Progress</span>
                </div>
                <span className="text-sm font-bold text-primary">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="mt-1.5 text-[11px] text-muted-foreground">{completed.length} of {tasks.length} tasks completed</p>
            </div>
          </motion.div>
        )}

        {/* ─── Daily Productivity Score (compact) ─── */}
        {!focusMode && (
          <div className="mb-5">
            <LazySection>
              <DailyProductivityScore completedToday={completedToday} totalToday={totalToday} streak={streak.current} />
            </LazySection>
          </div>
        )}

        {/* ─── Weekly Activity (horizontal scroll) ─── */}
        {!focusMode && (
          <div className="mb-5">
            <LazySection>
              <WeeklyChart rawTasks={rawTasks} />
            </LazySection>
          </div>
        )}

        {/* ─── AI Assistant (Collapsible) ─── */}
        <div className="mb-5">
          <CollapsibleAiPanel>
            <LazySection>
              <SmartRoutine existingTasks={tasks.map(t => ({ title: t.title, date: t.date, time: t.time, completed: t.completed }))} onTaskAdded={fetchTasks} />
            </LazySection>
            <LazySection>
              <AiSuggestionInner taskCount={tasks.length} />
            </LazySection>
            {/* Rescheduled Tasks */}
            <div className="glass-card-lite overflow-hidden">
              <div className="p-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <RefreshCw size={14} className="text-primary" />
                  AI Rescheduled
                  {rescheduledTasks.length > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{rescheduledTasks.length}</span>
                  )}
                </h4>
                {rescheduledTasks.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">No rescheduled tasks</p>
                ) : (
                  <div className="space-y-1.5">
                    {rescheduledTasks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">{t.date}{t.time ? ` at ${t.time}` : ""}</p>
                        </div>
                        <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
                          <RefreshCw size={10} /> {t.missedCount}×
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleAiPanel>
        </div>

        {/* ─── Quick Notes ─── */}
        <div id="quick-notes-section" className="mb-5">
          <div className="glass-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/15">
                <StickyNote size={14} className="text-secondary" />
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
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
              />
              <button onClick={addNote} disabled={!newNote.trim()} className="glass-card-lite self-end rounded-xl px-3 py-2 text-primary transition-colors hover:bg-primary/20 disabled:opacity-40">
                <Save size={16} />
              </button>
            </div>
            {quickNotes.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground/60">No notes yet</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {quickNotes.map((note) => (
                  <div key={note.id} className="glass-card-lite flex items-start gap-2 px-3 py-2">
                    <p className="flex-1 text-xs text-foreground whitespace-pre-wrap">{note.text}</p>
                    <button onClick={() => deleteNote(note.id)} className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:text-destructive">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Bottom Actions ─── */}
        <div className="flex gap-3">
          <button onClick={() => navigate("/tasks")} className="glass-card flex-1 bg-gradient-to-r from-primary/20 to-primary/5 px-4 py-3 text-center text-sm font-semibold text-foreground transition-shadow hover:shadow-elevated">
            <Plus size={16} className="mx-auto mb-1 text-primary" /> Add Task
          </button>
          <button onClick={() => navigate("/my-tasks")} className="glass-card flex-1 px-4 py-3 text-center text-sm font-semibold text-foreground transition-shadow hover:shadow-elevated">
            <ListTodo size={16} className="mx-auto mb-1 text-primary" /> View Tasks
          </button>
        </div>
      </div>

      {/* FAB */}
      <motion.button
        onClick={() => navigate("/tasks")}
        className="fixed bottom-6 right-6 z-50 glass-card flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-secondary/30 shadow-elevated"
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
      >
        <Plus size={24} className="text-foreground" />
      </motion.button>
    </div>
  );
};

function AiSuggestionInner({ taskCount }: { taskCount: number }) {
  const { suggestion, loading, refresh } = useAiSuggestion(taskCount);
  return <AiSuggestion tip={suggestion} loading={loading} onRefresh={refresh} />;
}

export default Dashboard;
