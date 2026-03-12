import { Bot, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface AiSuggestionProps {
  tip: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function AiSuggestion({ tip, loading, onRefresh }: AiSuggestionProps) {
  return (
    <div className="rounded-xl bg-accent p-5 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-accent-foreground" />
          <h3 className="font-display font-semibold text-accent-foreground">AI Suggestions</h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full p-1.5 text-accent-foreground/60 transition-all hover:bg-accent-foreground/10 hover:text-accent-foreground disabled:opacity-50"
            aria-label="Refresh suggestion"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        )}
      </div>
      {loading && !tip ? (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent-foreground/40" />
          <p className="text-sm text-accent-foreground/60">Thinking...</p>
        </div>
      ) : (
        <motion.p
          key={tip}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm leading-relaxed text-accent-foreground/80"
        >
          {tip}
        </motion.p>
      )}
    </div>
  );
}
