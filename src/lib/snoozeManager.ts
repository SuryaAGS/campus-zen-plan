const SNOOZE_KEY = "taskstodo-snooze-timers";

function getAll(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, number>) {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(data));
}

export function snoozeReminder(key: string, minutes: number) {
  const all = getAll();
  all[key] = Date.now() + minutes * 60 * 1000;
  saveAll(all);
}

export function isSnoozed(key: string): boolean {
  const all = getAll();
  const until = all[key];
  if (!until) return false;
  if (Date.now() < until) return true;
  // Expired — clean up
  delete all[key];
  saveAll(all);
  return false;
}
