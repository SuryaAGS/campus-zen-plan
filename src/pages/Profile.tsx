import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Save, User, Bell, Palette, Sun, Moon, Type, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  getThemeSettings,
  saveThemeSettings,
  accentColors,
  languages,
  type AccentColor,
  type FontSize,
  type Language,
} from "@/lib/themeSettings";

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [theme, setTheme] = useState(getThemeSettings);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || "");
          setAvatarUrl(data.avatar_url);
        } else {
          const meta = user.user_metadata;
          setDisplayName(meta?.full_name || meta?.display_name || meta?.name || "");
          setAvatarUrl(meta?.avatar_url || meta?.picture || null);
        }
      });
  }, [user]);

  const updateTheme = (patch: Partial<typeof theme>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    saveThemeSettings(next);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload avatar");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("user_id", user.id);

    setAvatarUrl(newUrl);
    setUploading(false);
    toast.success("Avatar updated!");
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto max-w-lg px-4 py-8">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
        >
          <ArrowLeft size={16} /> Back to Planner
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-card p-8 shadow-elevated"
        >
          <h1 className="mb-6 font-display text-2xl font-bold text-card-foreground">Your Profile</h1>

          {/* Avatar */}
          <div className="mb-6 flex flex-col items-center">
            <div
              className="relative mb-3 h-24 w-24 cursor-pointer overflow-hidden rounded-full bg-muted"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User size={40} className="text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <p className="text-xs text-muted-foreground">
              {uploading ? "Uploading..." : "Click to change avatar"}
            </p>
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Email (read-only) */}
          <div className="mb-6">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              value={user?.email || ""}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="gradient-bg flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:shadow-elevated hover:brightness-110 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </motion.div>

        {/* Theme Customization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 rounded-xl bg-card p-8 shadow-elevated"
        >
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-card-foreground">
            <Palette size={20} className="text-primary" />
            Theme Customization
          </h2>

          {/* Accent Color */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Accent Color</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(accentColors) as [AccentColor, typeof accentColors[AccentColor]][]).map(
                ([key, { label, preview }]) => (
                  <button
                    key={key}
                    onClick={() => updateTheme({ accentColor: key })}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      theme.accentColor === key
                        ? "border-primary bg-accent text-accent-foreground shadow-sm"
                        : "border-input text-muted-foreground hover:border-primary/40 hover:bg-muted"
                    }`}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: preview }}
                    />
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Font Size */}
          <div className="mb-6">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Type size={14} />
              Font Size
            </label>
            <div className="flex gap-2">
              {fontSizeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => updateTheme({ fontSize: value })}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    theme.fontSize === value
                      ? "border-primary bg-accent text-accent-foreground shadow-sm"
                      : "border-input text-muted-foreground hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-input px-4 py-3">
            <div className="flex items-center gap-2">
              {theme.darkMode ? (
                <Moon size={16} className="text-primary" />
              ) : (
                <Sun size={16} className="text-primary" />
              )}
              <span className="text-sm font-medium text-card-foreground">
                {theme.darkMode ? "Dark Mode" : "Light Mode"}
              </span>
            </div>
            <button
              onClick={() => updateTheme({ darkMode: !theme.darkMode })}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                theme.darkMode ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${
                  theme.darkMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Language Preference */}
          <div className="mt-6">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Globe size={14} />
              Language Preference
            </label>
            <p className="mb-3 text-xs text-muted-foreground/70">
              Sets your preferred language for future i18n support.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(languages) as [Language, typeof languages[Language]][]).map(
                ([key, { native, flag }]) => (
                  <button
                    key={key}
                    onClick={() => updateTheme({ language: key })}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      theme.language === key
                        ? "border-primary bg-accent text-accent-foreground shadow-sm"
                        : "border-input text-muted-foreground hover:border-primary/40 hover:bg-muted"
                    }`}
                  >
                    <span className="text-base">{flag}</span>
                    {native}
                  </button>
                )
              )}
            </div>
          </div>
        </motion.div>

        {/* Notification Settings Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <button
            onClick={() => navigate("/notifications")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-card py-3.5 text-sm font-medium text-muted-foreground shadow-card transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell size={16} />
            Notification Settings
          </button>
        </motion.div>
      </div>
    </div>
  );
}
