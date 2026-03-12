import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAiSuggestion(taskCount: number) {
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchSuggestion = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-suggestions");
      if (error) throw error;
      setSuggestion(data?.suggestion || "✨ Focus on one task at a time!");
    } catch {
      setSuggestion("✨ Focus on completing one task at a time for maximum productivity.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSuggestion();
  }, [fetchSuggestion, taskCount]);

  return { suggestion, loading, refresh: fetchSuggestion };
}
