import { useState } from "react";
import { Task } from "@/types/task";
import { Pencil, Bell, BellOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EditTaskDialogProps {
  task: Task;
  allCategories: string[];
  onSave: (id: string, updates: { title: string; date: string; time: string | null; priority: string; category: string; note?: string | null; alarm_enabled?: boolean }) => void;
}

const EditTaskDialog = ({ task, allCategories, onSave }: EditTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(task.date);
  const [time, setTime] = useState(task.time || "");
  const [priority, setPriority] = useState<string>(task.priority);
  const [category, setCategory] = useState<string>(task.category);
  const [note, setNote] = useState(task.note || "");
  const [alarmEnabled, setAlarmEnabled] = useState(task.alarm_enabled !== false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(task.title);
      setDate(task.date);
      setTime(task.time || "");
      setPriority(task.priority);
      setCategory(task.category);
      setNote(task.note || "");
      setAlarmEnabled(task.alarm_enabled !== false);
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    if (!title || !date) return;
    onSave(task.id, { title, date, time: time || null, priority, category, note: note || null, alarm_enabled: alarmEnabled });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          className="glass rounded-xl p-2 text-muted-foreground transition-all hover:text-foreground"
          title="Edit task"
        >
          <Pencil size={16} />
        </button>
      </DialogTrigger>
      <DialogContent className="glass-card sm:max-w-md border-none">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Alarm Toggle */}
          {time && (
            <div className="glass flex items-center justify-between rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                {alarmEnabled ? <Bell size={16} className="text-primary" /> : <BellOff size={16} className="text-muted-foreground" />}
                <span className="text-sm font-medium text-foreground">Alarm</span>
              </div>
              <button
                type="button"
                onClick={() => setAlarmEnabled(!alarmEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  alarmEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${
                    alarmEnabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="glass-input w-full rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a quick note..."
              rows={2}
              className="glass-input w-full rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elevated transition-all hover:brightness-110"
          >
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
