export type AccentColor = "indigo" | "teal" | "rose" | "amber" | "emerald" | "violet";
export type FontSize = "small" | "medium" | "large";

export interface ThemeSettings {
  accentColor: AccentColor;
  fontSize: FontSize;
  darkMode: boolean;
}

const STORAGE_KEY = "theme-settings";

const defaults: ThemeSettings = {
  accentColor: "indigo",
  fontSize: "medium",
  darkMode: false,
};

export const accentColors: Record<AccentColor, { label: string; hsl: string; preview: string }> = {
  indigo: { label: "Indigo", hsl: "234 85% 65%", preview: "hsl(234 85% 65%)" },
  teal: { label: "Teal", hsl: "180 60% 45%", preview: "hsl(180 60% 45%)" },
  rose: { label: "Rose", hsl: "350 80% 60%", preview: "hsl(350 80% 60%)" },
  amber: { label: "Amber", hsl: "38 92% 50%", preview: "hsl(38 92% 50%)" },
  emerald: { label: "Emerald", hsl: "152 68% 40%", preview: "hsl(152 68% 40%)" },
  violet: { label: "Violet", hsl: "270 70% 60%", preview: "hsl(270 70% 60%)" },
};

const secondaryMap: Record<AccentColor, string> = {
  indigo: "270 50% 55%",
  teal: "200 60% 50%",
  rose: "330 60% 50%",
  amber: "25 80% 50%",
  emerald: "170 55% 45%",
  violet: "290 55% 55%",
};

const fontSizeMap: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

export function getThemeSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveThemeSettings(settings: ThemeSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  applyTheme(settings);
}

export function applyTheme(settings?: ThemeSettings) {
  const s = settings || getThemeSettings();
  const root = document.documentElement;

  // Accent color
  const accent = accentColors[s.accentColor];
  root.style.setProperty("--primary", accent.hsl);
  root.style.setProperty("--ring", accent.hsl);
  root.style.setProperty("--secondary", secondaryMap[s.accentColor]);

  // Update gradient
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, hsl(${accent.hsl}), hsl(${secondaryMap[s.accentColor]}))`
  );

  // Font size
  root.style.fontSize = fontSizeMap[s.fontSize];

  // Dark mode
  if (s.darkMode) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
