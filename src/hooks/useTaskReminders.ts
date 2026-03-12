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
  const ONE_MIN = 60 * 1000;

  const dueNow: Task[] = [];
  const dueTwoMin: Task[] = [];
  const dueFiveMin: Task[] = [];

  for (const t of tasks) {
    if (t.completed || !t.time || !t.date) continue;
    const taskDateTime = new Date(`${t.date}T${t.time}`);
    if (isNaN(taskDateTime.getTime())) continue;
    const diff = taskDateTime.getTime() - nowMs;

    // Exact time: within ±1 minute
    if (diff >= -ONE_MIN && diff <= ONE_MIN) {
      dueNow.push(t);
    }
    // 2 minutes before: between 1 and 3 minutes ahead
    else if (diff > 1 * ONE_MIN && diff <= 3 * ONE_MIN) {
      dueTwoMin.push(t);
    }
    // 5 minutes before: between 4 and 6 minutes ahead
    else if (diff > 4 * ONE_MIN && diff <= 6 * ONE_MIN) {
      dueFiveMin.push(t);
    }
  }
  return { dueNow, dueTwoMin, dueFiveMin };
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
const TIME_2MIN_NOTIFIED_KEY = "collegemate-time-2min-notified";
const TIME_5MIN_NOTIFIED_KEY = "collegemate-time-5min-notified";

function hasNotifiedThisSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

function markNotifiedThisSession() {
  sessionStorage.setItem(SESSION_KEY, "true");
}

function getTimeNotifiedIds(key = TIME_NOTIFIED_KEY): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}

function markTimeNotified(ids: string[], key = TIME_NOTIFIED_KEY) {
  const existing = getTimeNotifiedIds(key);
  ids.forEach((id) => existing.add(id));
  sessionStorage.setItem(key, JSON.stringify([...existing]));
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

    const { dueNow, dueTwoMin, dueFiveMin } = getTasksDueSoonByTime(currentTasks);

    // 5-minute warning
    const already5min = getTimeNotifiedIds(TIME_5MIN_NOTIFIED_KEY);
    const new5min = dueFiveMin.filter((t) => !already5min.has(t.id) && !isSnoozed(`toast-time-5min-${t.id}`));
    for (const task of new5min) {
      const msg = `"${task.title}" starts at ${task.time} — 5 minutes!`;
      if (settings.enableToastReminders) showSnoozeableToast("info", `⏳ ${msg}`, `toast-time-5min-${task.id}`);
      if (settings.enablePushNotifications) sendBrowserNotification("⏳ 5 Minutes Left", msg);
    }
    if (new5min.length > 0) markTimeNotified(new5min.map((t) => t.id), TIME_5MIN_NOTIFIED_KEY);

    // 2-minute warning
    const already2min = getTimeNotifiedIds(TIME_2MIN_NOTIFIED_KEY);
    const new2min = dueTwoMin.filter((t) => !already2min.has(t.id) && !isSnoozed(`toast-time-2min-${t.id}`));
    for (const task of new2min) {
      const msg = `"${task.title}" starts at ${task.time} — 2 minutes!`;
      if (settings.enableToastReminders) showSnoozeableToast("warning", `⚡ ${msg}`, `toast-time-2min-${task.id}`);
      if (settings.enablePushNotifications) sendBrowserNotification("⚡ 2 Minutes Left", msg);
    }
    if (new2min.length > 0) markTimeNotified(new2min.map((t) => t.id), TIME_2MIN_NOTIFIED_KEY);

    // Exact time notification
    const alreadyNotified = getTimeNotifiedIds(TIME_NOTIFIED_KEY);
    const newDueNow = dueNow.filter((t) => !alreadyNotified.has(t.id) && !isSnoozed(`toast-time-${t.id}`));
    for (const task of newDueNow) {
      const msg = `"${task.title}" is due NOW!`;
      if (settings.enableToastReminders) showSnoozeableToast("warning", `⏰ ${msg}`, `toast-time-${task.id}`);
      if (settings.enablePushNotifications) sendBrowserNotification("⏰ Task Due Now", msg);
    }
    if (newDueNow.length > 0) markTimeNotified(newDueNow.map((t) => t.id), TIME_NOTIFIED_KEY);
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
