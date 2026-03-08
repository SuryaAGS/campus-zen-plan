import { useEffect, useRef, useCallback } from "react";
import { Task } from "@/types/task";
import { toast } from "sonner";
import { getNotificationSettings } from "@/lib/notificationSettings";
import { snoozeReminder, isSnoozed } from "@/lib/snoozeManager";

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

function getTasksDueSoonByTime(tasks: Task[]) {
  const now = new Date();
  const nowMs = now.getTime();
  const FIFTEEN_MIN = 15 * 60 * 1000;

  const dueSoon: Task[] = [];
  for (const t of tasks) {
    if (t.completed || !t.time || !t.date) continue;
    const taskDateTime = new Date(`${t.date}T${t.time}`);
    if (isNaN(taskDateTime.getTime())) continue;
    const diff = taskDateTime.getTime() - nowMs;
    if (diff <= FIFTEEN_MIN && diff >= -60_000) {
      dueSoon.push(t);
    }
  }
  return dueSoon;
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
    // Silently fail
  }
}

const SESSION_KEY = "collegemate-notified-session";
const TIME_NOTIFIED_KEY = "collegemate-time-notified";

function hasNotifiedThisSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

function markNotifiedThisSession() {
  sessionStorage.setItem(SESSION_KEY, "true");
}

function getTimeNotifiedIds(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(TIME_NOTIFIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markTimeNotified(ids: string[]) {
  const existing = getTimeNotifiedIds();
  ids.forEach((id) => existing.add(id));
  sessionStorage.setItem(TIME_NOTIFIED_KEY, JSON.stringify([...existing]));
}

function showSnoozeableToast(type: "warning" | "info", message: string, snoozeKey: string) {
  toast[type](message, {
    duration: 10000,
    action: {
      label: "Snooze 15m",
      onClick: () => {
        snoozeReminder(snoozeKey, 15);
        toast.info(`Snoozed for 15 minutes`);
      },
    },
  });
}

export function useTaskReminders(tasks: Task[]) {
  const hasNotified = useRef(hasNotifiedThisSession());
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  const checkReminders = useCallback(() => {
    const currentTasks = tasksRef.current;
    if (currentTasks.length === 0 || hasNotified.current) return;

    const settings = getNotificationSettings();
    const { dueToday, dueTomorrow } = getTasksDueSoon(currentTasks);

    if (dueToday.length > 0 && settings.enableDueToday && !isSnoozed("toast-due-today")) {
      const msg = dueToday.length === 1
        ? `"${dueToday[0].title}" is due today!`
        : `${dueToday.length} tasks are due today!`;
      if (settings.enableToastReminders) showSnoozeableToast("warning", msg, "toast-due-today");
      if (settings.enablePushNotifications) sendBrowserNotification("⚠️ Due Today", msg);
    }

    if (dueTomorrow.length > 0 && settings.enableDueTomorrow && !isSnoozed("toast-due-tomorrow")) {
      const msg = dueTomorrow.length === 1
        ? `"${dueTomorrow[0].title}" is due tomorrow`
        : `${dueTomorrow.length} tasks are due tomorrow`;
      if (settings.enableToastReminders) showSnoozeableToast("info", msg, "toast-due-tomorrow");
      if (settings.enablePushNotifications) sendBrowserNotification("📅 Due Tomorrow", msg);
    }

    if (dueToday.length > 0 || dueTomorrow.length > 0) {
      hasNotified.current = true;
      markNotifiedThisSession();
    }
  }, []);

  const checkTimeReminders = useCallback(() => {
    const currentTasks = tasksRef.current;
    if (currentTasks.length === 0) return;

    const settings = getNotificationSettings();
    if (!settings.enableDueToday) return;

    const dueSoon = getTasksDueSoonByTime(currentTasks);
    const alreadyNotified = getTimeNotifiedIds();
    const newDueSoon = dueSoon.filter((t) => !alreadyNotified.has(t.id) && !isSnoozed(`toast-time-${t.id}`));

    if (newDueSoon.length === 0) return;

    for (const task of newDueSoon) {
      const msg = `"${task.title}" is due at ${task.time}!`;
      if (settings.enableToastReminders) {
        showSnoozeableToast("warning", `⏰ ${msg}`, `toast-time-${task.id}`);
      }
      if (settings.enablePushNotifications) sendBrowserNotification("⏰ Coming Up Soon", msg);
    }

    markTimeNotified(newDueSoon.map((t) => t.id));
  }, []);

  useEffect(() => {
    const settings = getNotificationSettings();
    if (settings.enablePushNotifications) requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (tasks.length > 0 && !hasNotified.current) {
      checkReminders();
    }
  }, [tasks.length > 0, checkReminders]);

  useEffect(() => {
    if (tasks.length === 0) return;
    checkTimeReminders();
    const interval = setInterval(checkTimeReminders, 60_000);
    return () => clearInterval(interval);
  }, [tasks.length > 0, checkTimeReminders]);

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
