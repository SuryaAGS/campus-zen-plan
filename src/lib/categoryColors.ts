// Shared category color mapping
// Default categories get fixed colors; custom categories cycle through a palette

const defaultCategoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  Exam: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  Assignment: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  Project: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  Study: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500" },
  Other: { bg: "bg-gray-100 dark:bg-gray-800/40", text: "text-gray-600 dark:text-gray-300", dot: "bg-gray-500" },
};

const cyclePalette = [
  { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  { bg: "bg-lime-100 dark:bg-lime-900/30", text: "text-lime-700 dark:text-lime-300", dot: "bg-lime-500" },
  { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
];

const customColorCache: Record<string, { bg: string; text: string; dot: string }> = {};
let nextIndex = 0;

export function getCategoryColor(name: string) {
  if (defaultCategoryColors[name]) return defaultCategoryColors[name];
  if (customColorCache[name]) return customColorCache[name];

  const color = cyclePalette[nextIndex % cyclePalette.length];
  customColorCache[name] = color;
  nextIndex++;
  return color;
}

export const categoryEmojis: Record<string, string> = {
  Exam: "📝",
  Assignment: "📚",
  Project: "🔧",
  Study: "📖",
  Other: "📌",
};

export function getCategoryEmoji(name: string) {
  return categoryEmojis[name] || "🏷️";
}
