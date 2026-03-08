import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES } from "@/types/task";
import { toast } from "sonner";

export interface UserCategory {
  id: string;
  name: string;
}

export function useCategories() {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("user_categories")
      .select("id, name")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load categories");
    } else {
      setCustomCategories(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const allCategoryNames: string[] = [
    ...CATEGORIES,
    ...customCategories.map((c) => c.name),
  ];

  const addCategory = async (name: string) => {
    if (!user) return false;
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (allCategoryNames.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Category already exists");
      return false;
    }
    const { error } = await supabase
      .from("user_categories")
      .insert({ user_id: user.id, name: trimmed });
    if (error) {
      toast.error("Failed to add category");
      return false;
    }
    await fetchCategories();
    return true;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("user_categories").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete category");
      return;
    }
    await fetchCategories();
  };

  return { customCategories, allCategoryNames, loading, addCategory, deleteCategory };
}
