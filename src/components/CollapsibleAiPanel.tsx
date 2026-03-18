import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Bot } from "lucide-react";

interface CollapsibleAiPanelProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleAiPanel({ children, defaultOpen = false }: CollapsibleAiPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass-card overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary/30" />
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-primary/5"
      >
        <div className="flex items-center gap-2.5">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
            <Bot size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">AI Assistant</h3>
            <p className="text-[11px] text-muted-foreground">Suggestions, routines & rescheduled tasks</p>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-5 pb-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
