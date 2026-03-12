import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      navigate("/");
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-xl bg-card p-8 shadow-elevated text-center"
        >
          <ClipboardCheck size={32} className="mx-auto text-primary mb-4" />
          <h2 className="font-display text-xl font-semibold text-card-foreground mb-2">Invalid Link</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This password reset link is invalid or has expired.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl bg-card p-8 shadow-elevated"
      >
        <div className="mb-6 flex items-center justify-center gap-2">
          <GraduationCap size={32} className="text-primary" />
          <h1 className="font-display text-2xl font-bold text-card-foreground">CollegeMate</h1>
        </div>

        <h2 className="mb-6 text-center font-display text-xl font-semibold text-card-foreground">
          Set New Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="gradient-bg flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:shadow-elevated hover:brightness-110 disabled:opacity-50"
          >
            <KeyRound size={16} />
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
