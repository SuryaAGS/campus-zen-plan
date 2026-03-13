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
  const overdueRepeat: Task[] = [];

  for (const t of tasks) {
    if (t.completed || !t.time || !t.date) continue;
    if (t.alarm_enabled === false) continue; // skip tasks with alarm disabled
    const taskDateTime = new Date(`${t.date}T${t.time}`);
    if (isNaN(taskDateTime.getTime())) continue;
    const diff = taskDateTime.getTime() - nowMs;

    // Exact time: within ±1 minute
    if (diff >= -ONE_MIN && diff <= ONE_MIN) {
      dueNow.push(t);
    }
    // 2 minutes before
    else if (diff > 1 * ONE_MIN && diff <= 3 * ONE_MIN) {
      dueTwoMin.push(t);
    }
    // 5 minutes before
    else if (diff > 4 * ONE_MIN && diff <= 6 * ONE_MIN) {
      dueFiveMin.push(t);
    }
    // Overdue: repeat every 10 minutes if not completed
    else if (diff < -ONE_MIN) {
      const minutesOverdue = Math.abs(diff) / ONE_MIN;
      // Fire at every 10-minute interval (with 1-min tolerance window)
      if (minutesOverdue % 10 < 1.5) {
        overdueRepeat.push(t);
      }
    }
  }
  return { dueNow, dueTwoMin, dueFiveMin, overdueRepeat };
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((result) => {
      if (result === "granted") {
        toast.success("🔔 Notifications enabled! You'll get alerts for upcoming tasks.");
      }
    });
  }
}

async function sendBrowserNotification(title: string, body: string, tag?: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      reg.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        tag: tag || `task-${Date.now()}`,
        renotify: true,
      });
    } else {
      new Notification(title, { body, icon: "/pwa-192x192.png" });
    }
  } catch {
    // Silently fail
  }
}

const SESSION_KEY = "taskstodo-notified-session";
const TIME_NOTIFIED_KEY = "taskstodo-time-notified";
const TIME_2MIN_NOTIFIED_KEY = "taskstodo-time-2min-notified";
const TIME_5MIN_NOTIFIED_KEY = "taskstodo-time-5min-notified";
const REPEAT_NOTIFIED_KEY = "taskstodo-repeat-notified";

// Alarm sound for notifications
function playAlarmSound(urgent = false) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = (freq: number, startTime: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      osc.type = "sine";
      gain.gain.setValueAtTime(volume, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    if (urgent) {
      // Urgent: 3 rapid beeps
      playBeep(880, 0, 0.3, 0.4);
      playBeep(1100, 0.35, 0.3, 0.4);
      playBeep(880, 0.7, 0.3, 0.4);
      playBeep(1100, 1.05, 0.3, 0.4);
    } else {
      // Normal: 2 gentle beeps
      playBeep(880, 0, 0.5, 0.3);
      playBeep(1100, 0.3, 0.5, 0.3);
    }
  } catch {}
}

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

// For repeat alarms, use a time-based key so they can fire again
function getRepeatNotifiedMap(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(REPEAT_NOTIFIED_KEY) || "{}");
  } catch {
    return {};
  }
}

function markRepeatNotified(taskId: string) {
  const map = getRepeatNotifiedMap();
  map[taskId] = Date.now();
  sessionStorage.setItem(REPEAT_NOTIFIED_KEY, JSON.stringify(map));
}

function canRepeatNotify(taskId: string): boolean {
  const map = getRepeatNotifiedMap();
  const lastNotified = map[taskId];
  if (!lastNotified) return true;
  // Allow re-notify every 9 minutes (with buffer for the 10-min cycle)
  return Date.now() - lastNotified > 9 * 60 * 1000;
}

function showSnoozeableToast(type: "warning" | "info", message: string, snoozeKey: string, withAlarm = false) {
  if (withAlarm) playAlarmSound(type === "warning");
  toast[type](message, {
    duration: 15000,
    action: {
      label: "Snooze 10m",
      onClick: () => {
        snoozeReminder(snoozeKey, 10);
        toast.info(`Snoozed for 10 minutes`);
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
      if (settings.enablePushNotifications) sendBrowserNotification("⚠️ Due Today", msg, "due-today");
    }

    if (dueTomorrow.length > 0 && settings.enableDueTomorrow && !isSnoozed("toast-due-tomorrow")) {
      const msg = dueTomorrow.length === 1
        ? `"${dueTomorrow[0].title}" is due tomorrow`
        : `${dueTomorrow.length} tasks are due tomorrow`;
      if (settings.enableToastReminders) showSnoozeableToast("info", msg, "toast-due-tomorrow");
      if (settings.enablePushNotifications) sendBrowserNotification("📅 Due Tomorrow", msg, "due-tomorrow");
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

    const { dueNow, dueTwoMin, dueFiveMin, overdueRepeat } = getTasksDueSoonByTime(currentTasks);

    // 5-minute warning
    const already5min = getTimeNotifiedIds(TIME_5MIN_NOTIFIED_KEY);
    const new5min = dueFiveMin.filter((t) => !already5min.has(t.id) && !isSnoozed(`toast-time-5min-${t.id}`));
    for (const task of new5min) {
      const msg = `"${task.title}" starts at ${task.time} — 5 minutes!`;
      if (settings.enableToastReminders) showSnoozeableToast("info", `⏳ ${msg}`, `toast-time-5min-${task.id}`);
      if (settings.enablePushNotifications) sendBrowserNotification("⏳ 5 Minutes Left", msg, `5min-${task.id}`);
    }
    if (new5min.length > 0) markTimeNotified(new5min.map((t) => t.id), TIME_5MIN_NOTIFIED_KEY);

    // 2-minute warning
    const already2min = getTimeNotifiedIds(TIME_2MIN_NOTIFIED_KEY);
    const new2min = dueTwoMin.filter((t) => !already2min.has(t.id) && !isSnoozed(`toast-time-2min-${t.id}`));
    for (const task of new2min) {
      const msg = `"${task.title}" starts at ${task.time} — 2 minutes!`;
      if (settings.enableToastReminders) showSnoozeableToast("warning", `⚡ ${msg}`, `toast-time-2min-${task.id}`, true);
      if (settings.enablePushNotifications) sendBrowserNotification("⚡ 2 Minutes Left", msg, `2min-${task.id}`);
    }
    if (new2min.length > 0) markTimeNotified(new2min.map((t) => t.id), TIME_2MIN_NOTIFIED_KEY);

    // Exact time notification
    const alreadyNotified = getTimeNotifiedIds(TIME_NOTIFIED_KEY);
    const newDueNow = dueNow.filter((t) => !alreadyNotified.has(t.id) && !isSnoozed(`toast-time-${t.id}`));
    for (const task of newDueNow) {
      const msg = `"${task.title}" is due NOW!`;
      if (settings.enableToastReminders) showSnoozeableToast("warning", `⏰ ${msg}`, `toast-time-${task.id}`, true);
      if (settings.enablePushNotifications) sendBrowserNotification("⏰ Task Due Now", msg, `now-${task.id}`);
    }
    if (newDueNow.length > 0) markTimeNotified(newDueNow.map((t) => t.id), TIME_NOTIFIED_KEY);

    // Repeat alarm every 10 minutes for overdue uncompleted tasks
    for (const task of overdueRepeat) {
      if (!canRepeatNotify(task.id)) continue;
      if (isSnoozed(`toast-repeat-${task.id}`)) continue;
      const msg = `"${task.title}" is overdue and not completed!`;
      if (settings.enableToastReminders) showSnoozeableToast("warning", `🔁 ${msg}`, `toast-repeat-${task.id}`, true);
      if (settings.enablePushNotifications) sendBrowserNotification("🔁 Task Overdue", msg, `repeat-${task.id}-${Date.now()}`);
      markRepeatNotified(task.id);
    }
  }, []);

  // Request permission on first load
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (tasks.length > 0 && !hasNotified.current) {
      checkReminders();
    }
  }, [tasks.length > 0, checkReminders]);

  useEffect(() => {
    if (tasks.length === 0) return;
    checkTimeReminders();
    const interval = setInterval(checkTimeReminders, 30_000); // Check every 30 seconds for precision
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
