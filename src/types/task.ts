export interface Task {
  id: string;
  title: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  completed: boolean;
}
