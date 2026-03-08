import { Bot } from "lucide-react";

interface AiSuggestionProps {
  tip: string;
}

export default function AiSuggestion({ tip }: AiSuggestionProps) {
  return (
    <div className="rounded-xl bg-accent p-5 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <Bot size={20} className="text-accent-foreground" />
        <h3 className="font-display font-semibold text-accent-foreground">AI Suggestions</h3>
      </div>
      <p className="text-sm leading-relaxed text-accent-foreground/80">{tip}</p>
    </div>
  );
}
