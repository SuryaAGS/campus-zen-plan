const SETTINGS_KEY = "taskstodo-notification-settings";

export interface NotificationSettings {
  enableToastReminders: boolean;
  enablePushNotifications: boolean;
  enableReminderBanners: boolean;
  reminderIntervalMinutes: number;
  enableDueToday: boolean;
  enableDueTomorrow: boolean;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enableToastReminders: true,
  enablePushNotifications: true,
  enableReminderBanners: true,
  reminderIntervalMinutes: 30,
  enableDueToday: true,
  enableDueTomorrow: true,
};

export function getNotificationSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
