import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { CATEGORIES } from "@/types/task";
import { getCategoryColor } from "@/lib/categoryColors";

const Categories = () => {
  const navigate = useNavigate();
  const { customCategories, addCategory, deleteCategory, loading } = useCategories();
  const [newName, setNewName] = useState("");

  const handleAdd = async () => {
    const success = await addCategory(newName);
    if (success) setNewName("");
  };

  return (
    <div className="gradient-bg min-h-screen">
      <div className="container mx-auto max-w-lg px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="font-display mb-6 text-3xl font-bold text-primary-foreground">
          Manage Categories
        </h1>

        {/* Default categories */}
        <div className="mb-6 rounded-xl bg-card p-5 shadow-elevated">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Default Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${getCategoryColor(c).bg} ${getCategoryColor(c).text}`}
              >
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${getCategoryColor(c).dot}`} />
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Custom categories */}
        <div className="rounded-xl bg-card p-5 shadow-elevated">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Custom Categories
          </h2>

          <div className="mb-4 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button
              onClick={handleAdd}
              className="gradient-bg flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:shadow-elevated hover:brightness-110"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : customCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom categories yet.</p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {customCategories.map((cat) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className={`inline-block h-3 w-3 rounded-full ${getCategoryColor(cat.name).dot}`} /> {cat.name}
                    </span>
                    </span>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
