import { describe, it, expect } from "vitest";
import { autoReschedule } from "@/lib/tasks";
import { Task } from "@/types/task";

const makeTask = (date: string, completed = false): Task => ({
  id: crypto.randomUUID(),
  title: "Test task",
  date,
  priority: "High",
  category: "Assignment",
  completed,
});

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

describe("autoReschedule", () => {
  it("reschedules overdue incomplete tasks to tomorrow", () => {
    const tasks = [makeTask("2024-01-01")];
    const result = autoReschedule(tasks);
    expect(result[0].date).toBe(tomorrow());
  });

  it("does not reschedule completed tasks", () => {
    const tasks = [makeTask("2024-01-01", true)];
    const result = autoReschedule(tasks);
    expect(result[0].date).toBe("2024-01-01");
  });

  it("does not reschedule future tasks", () => {
    const futureDate = "2099-12-31";
    const tasks = [makeTask(futureDate)];
    const result = autoReschedule(tasks);
    expect(result[0].date).toBe(futureDate);
  });

  it("handles empty array", () => {
    expect(autoReschedule([])).toEqual([]);
  });

  it("only reschedules overdue tasks in a mixed list", () => {
    const tasks = [
      makeTask("2024-01-01"),
      makeTask("2099-12-31"),
      makeTask("2024-06-01", true),
    ];
    const result = autoReschedule(tasks);
    expect(result[0].date).toBe(tomorrow());
    expect(result[1].date).toBe("2099-12-31");
    expect(result[2].date).toBe("2024-06-01");
  });
});
