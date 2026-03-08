import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Task, Category } from "@/types/task";
import { getCategoryColor, getCategoryEmoji } from "@/lib/categoryColors";
import { toast } from "sonner";

type ViewMode = "week" | "month";

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const s = new Date(d);
  s.setDate(diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date) {
  return a.toISOString().split("T")[0] === b.toISOString().split("T")[0];
}

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CalendarView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("date", { ascending: true });
    if (error) {
      toast.error("Failed to load tasks");
      return;
    }
    setTasks(
      (data || []).map((t) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        time: (t as any).time || null,
        priority: t.priority as Task["priority"],
        category: t.category as Category,
        completed: t.completed,
      }))
    );
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Week view dates
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month view dates
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const monthGridStart = startOfWeek(monthStart);
  const totalCells = Math.ceil((monthEnd.getTime() - monthGridStart.getTime()) / (86400000)) + (7 - monthEnd.getDay());
  const gridDays = Array.from({ length: Math.max(35, Math.ceil(totalCells / 7) * 7) }, (_, i) => addDays(monthGridStart, i));

  const getTasksForDate = (date: Date) => tasks.filter((t) => t.date === fmt(date));

  const prev = () => {
    if (view === "week") setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const next = () => {
    if (view === "week") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  const headerLabel = view === "week"
    ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const renderDayCell = (date: Date, isCompact: boolean) => {
    const dayTasks = getTasksForDate(date);
    const isToday = isSameDay(date, today);
    const isCurrentMonth = date.getMonth() === currentDate.getMonth();

    return (
      <div
        key={fmt(date)}
        className={`flex flex-col rounded-lg border border-border/50 p-1.5 transition-colors ${
          isToday ? "bg-accent/50 border-ring" : "bg-card/60"
        } ${!isCurrentMonth && view === "month" ? "opacity-40" : ""}`}
        style={{ minHeight: isCompact ? 80 : 110 }}
      >
        <span className={`mb-1 text-xs font-semibold ${isToday ? "text-accent-foreground" : "text-muted-foreground"}`}>
          {date.getDate()}
        </span>
        <div className="flex-1 space-y-0.5 overflow-y-auto">
          {dayTasks.slice(0, isCompact ? 3 : 4).map((task) => {
            const color = getCategoryColor(task.category);
            return (
              <div
                key={task.id}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${color.bg} ${color.text} ${task.completed ? "line-through opacity-50" : ""}`}
                title={`${task.title} (${task.priority})`}
              >
                <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`} />
                <span className="truncate">{task.title}</span>
                {task.time && <span className="ml-auto shrink-0 opacity-70">{task.time}</span>}
              </div>
            );
          })}
          {dayTasks.length > (isCompact ? 3 : 4) && (
            <span className="text-[10px] text-muted-foreground">+{dayTasks.length - (isCompact ? 3 : 4)} more</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="gradient-bg min-h-screen">
      <div className="container mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("week")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                view === "week" ? "bg-card text-foreground shadow-card" : "bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20"
              }`}
            >
              <CalendarRange size={12} /> Week
            </button>
            <button
              onClick={() => setView("month")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                view === "month" ? "bg-card text-foreground shadow-card" : "bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20"
              }`}
            >
              <CalendarDays size={12} /> Month
            </button>
          </div>
        </div>

        <h1 className="font-display mb-4 text-3xl font-bold text-primary-foreground">Calendar</h1>

        {/* Navigation */}
        <div className="mb-4 flex items-center justify-between rounded-xl bg-card p-3 shadow-elevated">
          <button onClick={prev} className="rounded-md p-2 text-foreground transition-colors hover:bg-accent">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-semibold text-foreground">{headerLabel}</span>
            <button
              onClick={goToday}
              className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Today
            </button>
          </div>
          <button onClick={next} className="rounded-md p-2 text-foreground transition-colors hover:bg-accent">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <motion.div
          key={`${view}-${headerLabel}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-card/40 p-3 shadow-elevated"
        >
          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-primary-foreground/70">{d}</div>
            ))}
          </div>

          {view === "week" ? (
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d) => renderDayCell(d, false))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((d) => renderDayCell(d, true))}
            </div>
          )}
        </motion.div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from(new Set(tasks.map((t) => t.category))).map((cat) => {
            const color = getCategoryColor(cat);
            return (
              <span key={cat} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${color.bg} ${color.text}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${color.dot}`} />
                {cat}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
