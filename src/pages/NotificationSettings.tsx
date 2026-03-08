import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, MessageSquare, Smartphone, LayoutList, Clock, CalendarCheck, CalendarClock, Loader2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getNotificationSettings, saveNotificationSettings, NotificationSettings, DEFAULT_SETTINGS } from "@/lib/notificationSettings";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
  const { isSubscribed, isSupported: pushSupported, isLoading: pushLoading, subscribe, unsubscribe } = usePushSubscription();

  const update = (patch: Partial<NotificationSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveNotificationSettings(next);
  };

  const resetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    saveNotificationSettings(DEFAULT_SETTINGS);
    toast.success("Settings reset to defaults");
  };

  const pushPermission = ("Notification" in window) ? Notification.permission : "denied";

  const requestPush = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    if (result === "granted") {
      update({ enablePushNotifications: true });
      toast.success("Push notifications enabled!");
    } else {
      toast.error("Permission denied. Enable in browser settings.");
    }
  };

  const handleBackgroundPushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) toast.success("Background notifications disabled");
    } else {
      if ("Notification" in window && Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          toast.error("Permission denied. Enable in browser settings.");
          return;
        }
      }
      if ("Notification" in window && Notification.permission === "denied") {
        toast.error("Notifications blocked. Enable in browser settings.");
        return;
      }
      const success = await subscribe();
      if (success) toast.success("Background notifications enabled!");
      else toast.error("Failed to enable background notifications");
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto max-w-lg px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-card p-6 shadow-elevated sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <Bell size={24} className="text-primary" />
            <h1 className="font-display text-2xl font-bold text-card-foreground">Notification Settings</h1>
          </div>

          <div className="space-y-6">
            {/* Reminder Types */}
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Reminder Types</h2>
              <div className="space-y-4">
                <SettingRow
                  icon={<CalendarCheck size={18} />}
                  label="Due today reminders"
                  description="Get reminded about tasks due today"
                  checked={settings.enableDueToday}
                  onChange={(v) => update({ enableDueToday: v })}
                />
                <SettingRow
                  icon={<CalendarClock size={18} />}
                  label="Due tomorrow reminders"
                  description="Get reminded about tasks due tomorrow"
                  checked={settings.enableDueTomorrow}
                  onChange={(v) => update({ enableDueTomorrow: v })}
                />
              </div>
            </div>

            {/* Notification Channels */}
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Channels</h2>
              <div className="space-y-4">
                <SettingRow
                  icon={<MessageSquare size={18} />}
                  label="In-app toast alerts"
                  description="Show pop-up notifications inside the app"
                  checked={settings.enableToastReminders}
                  onChange={(v) => update({ enableToastReminders: v })}
                />
                <SettingRow
                  icon={<LayoutList size={18} />}
                  label="Reminder banners"
                  description="Show due-today / due-tomorrow banners on the main screen"
                  checked={settings.enableReminderBanners}
                  onChange={(v) => update({ enableReminderBanners: v })}
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      <Smartphone size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Push notifications</p>
                      <p className="text-xs text-muted-foreground">
                        {!("Notification" in window)
                          ? "Not supported in this browser"
                          : pushPermission === "granted"
                          ? "Browser notifications when tasks are due"
                          : pushPermission === "denied"
                          ? "Blocked — enable in browser settings"
                          : "Requires browser permission"}
                      </p>
                    </div>
                  </div>
                  {"Notification" in window && pushPermission === "granted" ? (
                    <Switch
                      checked={settings.enablePushNotifications}
                      onCheckedChange={(v) => update({ enablePushNotifications: v })}
                    />
                  ) : "Notification" in window && pushPermission === "default" ? (
                    <button
                      onClick={requestPush}
                      className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Enable
                    </button>
                  ) : null}
                </div>

                {/* Background Push (server-side) */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Background notifications</p>
                      <p className="text-xs text-muted-foreground">
                        {!pushSupported
                          ? "Not supported in this browser"
                          : isSubscribed
                          ? "Receive reminders even when the app is closed"
                          : "Get notified about tasks even when offline"}
                      </p>
                    </div>
                  </div>
                  {pushSupported && (
                    <button
                      onClick={handleBackgroundPushToggle}
                      disabled={pushLoading}
                      className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        isSubscribed
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {pushLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isSubscribed ? (
                        "Disable"
                      ) : (
                        "Enable"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Timing */}
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Timing</h2>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-muted-foreground">
                  <Clock size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Re-check interval</p>
                  <p className="mb-2 text-xs text-muted-foreground">How often to re-trigger reminders</p>
                  <select
                    value={settings.reminderIntervalMinutes}
                    onChange={(e) => update({ reminderIntervalMinutes: Number(e.target.value) })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every hour</option>
                    <option value={120}>Every 2 hours</option>
                    <option value={0}>Never re-check</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={resetDefaults}
              className="w-full rounded-md border border-input py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Reset to Defaults
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
