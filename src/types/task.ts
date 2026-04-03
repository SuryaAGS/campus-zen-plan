export const CATEGORIES = ["Exam", "Assignment", "Project", "Study", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

export type RepeatOption = "none" | "daily" | "weekly";

export interface Task {
  id: string;
  title: string;
  date: string;
  time: string | null;
  priority: "High" | "Medium" | "Low";
  category: Category;
  completed: boolean;
  note?: string | null;
  alarm_enabled?: boolean;
  repeat?: RepeatOption;
}
