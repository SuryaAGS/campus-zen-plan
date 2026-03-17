import { Bot, RefreshCw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface AiSuggestionProps {
  tip: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function AiSuggestion({ tip, loading, onRefresh }: AiSuggestionProps) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Gradient accent strip */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary/50" />
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles size={16} className="text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground">AI Suggestions</h3>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="glass rounded-xl p-2 text-muted-foreground transition-all hover:text-primary disabled:opacity-50"
              aria-label="Refresh suggestion"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
        {loading && !tip ? (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary/40" />
            <p className="text-sm text-muted-foreground">Thinking...</p>
          </div>
        ) : (
          <motion.p
            key={tip}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm leading-relaxed text-foreground/80"
          >
            {tip}
          </motion.p>
        )}
      </div>
    </div>
  );
}
