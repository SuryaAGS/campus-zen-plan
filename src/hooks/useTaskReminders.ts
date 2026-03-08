import { useEffect, useRef, useCallback } from "react";
import { Task } from "@/types/task";
import { toast } from "sonner";
import { getNotificationSettings } from "@/lib/notificationSettings";

function getTasksDueSoon(tasks: Task[]) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const dueToday = tasks.filter((t) => !t.completed && t.date === today);
  const dueTomorrow = tasks.filter((t) => !t.completed && t.date === tomorrowStr);

  return { dueToday, dueTomorrow };
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

async function sendBrowserNotification(title: string, body: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      reg.showNotification(title, { body, icon: "/favicon.ico" });
    } else {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  } catch {
    // Silently fail — toast notifications still work as fallback
  }
}

const SESSION_KEY = "collegemate-notified-session";

function hasNotifiedThisSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

function markNotifiedThisSession() {
  sessionStorage.setItem(SESSION_KEY, "true");
}

export function useTaskReminders(tasks: Task[]) {
  const hasNotified = useRef(hasNotifiedThisSession());
  const tasksRef = useRef<Task[]>([]);
  
  // Keep tasks ref in sync without triggering effects
  tasksRef.current = tasks;

  const checkReminders = useCallback(() => {
    const currentTasks = tasksRef.current;
    if (currentTasks.length === 0 || hasNotified.current) return;

    const settings = getNotificationSettings();
    const { dueToday, dueTomorrow } = getTasksDueSoon(currentTasks);

    if (dueToday.length > 0 && settings.enableDueToday) {
      const msg = dueToday.length === 1
        ? `"${dueToday[0].title}" is due today!`
        : `${dueToday.length} tasks are due today!`;
      if (settings.enableToastReminders) toast.warning(msg, { duration: 8000 });
      if (settings.enablePushNotifications) sendBrowserNotification("⚠️ Due Today", msg);
    }

    if (dueTomorrow.length > 0 && settings.enableDueTomorrow) {
      const msg = dueTomorrow.length === 1
        ? `"${dueTomorrow[0].title}" is due tomorrow`
        : `${dueTomorrow.length} tasks are due tomorrow`;
      if (settings.enableToastReminders) toast.info(msg, { duration: 6000 });
      if (settings.enablePushNotifications) sendBrowserNotification("📅 Due Tomorrow", msg);
    }

    if (dueToday.length > 0 || dueTomorrow.length > 0) {
      hasNotified.current = true;
    }
  }, []);

  useEffect(() => {
    const settings = getNotificationSettings();
    if (settings.enablePushNotifications) requestNotificationPermission();
  }, []);

  // Only run once when tasks first load
  useEffect(() => {
    if (tasks.length > 0 && !hasNotified.current) {
      checkReminders();
    }
  }, [tasks.length > 0, checkReminders]);

  useEffect(() => {
    const settings = getNotificationSettings();
    if (settings.reminderIntervalMinutes === 0) return;
    const interval = setInterval(() => {
      hasNotified.current = false;
      checkReminders();
    }, settings.reminderIntervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  return getTasksDueSoon(tasks);
}
