import { memo, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface WeeklyChartProps {
  rawTasks: Array<{ date: string; completed: boolean }>;
}

const WeeklyChart = memo(function WeeklyChart({ rawTasks }: WeeklyChartProps) {
  const weeklyData = useMemo(() => {
    const days: { day: string; date: string; completed: number; total: number }[] = [];
    const now = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTasks = rawTasks.filter((t) => t.date === dateStr);
      const dayCompleted = dayTasks.filter((t) => t.completed);
      days.push({
        day: i === 0 ? "Today" : dayNames[d.getDay()],
        date: dateStr,
        completed: dayCompleted.length,
        total: dayTasks.length,
      });
    }
    return days;
  }, [rawTasks]);

  return (
    <div className="glass-card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
          <BarChart3 size={16} className="text-primary" />
        </div>
        Weekly Activity
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} width={24} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--glass-bg))",
                backdropFilter: "blur(16px)",
                border: "1px solid hsl(var(--glass-border))",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number, name: string) => [
                value,
                name === "completed" ? "Completed" : "Total",
              ]}
            />
            <Bar dataKey="total" fill="hsl(var(--muted-foreground) / 0.2)" radius={[6, 6, 0, 0]} name="total" />
            <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="completed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/25" />
          Total
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
          Completed
        </span>
      </div>
    </div>
  );
});

export default WeeklyChart;
