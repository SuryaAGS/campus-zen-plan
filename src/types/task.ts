export const CATEGORIES = ["Exam", "Assignment", "Project", "Study", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Task {
  id: string;
  title: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  category: Category;
  completed: boolean;
}
