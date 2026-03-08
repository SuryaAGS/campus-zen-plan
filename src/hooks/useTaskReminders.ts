import { useEffect, useRef, useCallback } from "react";
import { Task } from "@/types/task";
import { toast } from "sonner";

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

function sendBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

export function useTaskReminders(tasks: Task[]) {
  const hasNotified = useRef(false);

  const checkReminders = useCallback(() => {
    if (tasks.length === 0 || hasNotified.current) return;

    const { dueToday, dueTomorrow } = getTasksDueSoon(tasks);

    if (dueToday.length > 0) {
      const msg = dueToday.length === 1
        ? `"${dueToday[0].title}" is due today!`
        : `${dueToday.length} tasks are due today!`;
      toast.warning(msg, { duration: 8000 });
      sendBrowserNotification("⚠️ Due Today", msg);
    }

    if (dueTomorrow.length > 0) {
      const msg = dueTomorrow.length === 1
        ? `"${dueTomorrow[0].title}" is due tomorrow`
        : `${dueTomorrow.length} tasks are due tomorrow`;
      toast.info(msg, { duration: 6000 });
      sendBrowserNotification("📅 Due Tomorrow", msg);
    }

    if (dueToday.length > 0 || dueTomorrow.length > 0) {
      hasNotified.current = true;
    }
  }, [tasks]);

  // Request permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Check reminders when tasks load
  useEffect(() => {
    checkReminders();
  }, [checkReminders]);

  // Re-check every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      hasNotified.current = false;
      checkReminders();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  return getTasksDueSoon(tasks);
}
