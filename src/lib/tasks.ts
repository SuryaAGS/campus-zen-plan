import { Task } from "@/types/task";

const STORAGE_KEY = "taskstodo-tasks";
const STREAK_KEY = "taskstodo-streak";

export interface StreakData {
  current: number;
  lastCompletionDate: string | null;
}

export function loadTasks(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function loadStreak(): StreakData {
  try {
    const data = JSON.parse(localStorage.getItem(STREAK_KEY) || "null");
    if (data && typeof data.current === "number") return data;
  } catch {}
  return { current: 0, lastCompletionDate: null };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export function recordCompletion(): StreakData {
  const streak = loadStreak();
  const today = todayStr();

  if (streak.lastCompletionDate === today) return streak;

  if (streak.lastCompletionDate === yesterdayStr() || streak.lastCompletionDate === today) {
    streak.current += 1;
  } else {
    streak.current = 1;
  }
  streak.lastCompletionDate = today;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  return streak;
}

export function refreshStreak(): StreakData {
  const streak = loadStreak();
  const today = todayStr();
  const yesterday = yesterdayStr();
  if (streak.lastCompletionDate !== today && streak.lastCompletionDate !== yesterday) {
    streak.current = 0;
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  }
  return streak;
}

export function getAiSuggestion(tasks: Task[]): string {
  const pending = tasks.filter((t) => !t.completed);
  const high = pending.filter((t) => t.priority === "High");

  if (pending.length === 0) return "🎉 Amazing! You've completed all your tasks. Time to relax or plan ahead!";
  if (high.length > 3) return "🔴 You have several high-priority tasks. Focus on the most urgent one first — don't multitask!";
  if (pending.length > 5) return "📋 You have many pending tasks. Try the Pomodoro technique: 25 min focused work, 5 min break.";
  if (high.length > 0) return `⚡ Start with "${high[0].title}" — it's high priority. Break it into smaller steps if needed.`;
  return "✨ You're on track! Focus on completing one task at a time for maximum productivity.";
}

export function autoReschedule(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return tasks.map((task) => {
    if (!task.completed) {
      const due = new Date(task.date);
      if (due < today) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { ...task, date: tomorrow.toISOString().split("T")[0] };
      }
    }
    return task;
  });
}
