import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-card p-8 text-center shadow-elevated"
        >
          <Smartphone size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="font-display mb-2 text-2xl font-bold text-foreground">Install Tasks To Do</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Install the app on your device for quick access, offline support, and a native app experience.
          </p>

          {installed ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-accent p-4 text-accent-foreground">
              <Check size={20} />
              <span className="font-semibold">App installed successfully!</span>
            </div>
          ) : deferredPrompt ? (
            <button
              onClick={handleInstall}
              className="gradient-bg inline-flex items-center gap-2 rounded-lg px-6 py-3 text-lg font-semibold text-primary-foreground shadow-card transition-all hover:shadow-elevated hover:brightness-110"
            >
              <Download size={20} /> Install Now
            </button>
          ) : (
            <div className="space-y-4 text-left">
              <p className="text-sm font-medium text-foreground">To install manually:</p>
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-semibold text-foreground">📱 iPhone / iPad</p>
                  <p className="text-xs text-muted-foreground">
                    Tap the <strong>Share</strong> button → <strong>Add to Home Screen</strong>
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-semibold text-foreground">🤖 Android</p>
                  <p className="text-xs text-muted-foreground">
                    Tap the <strong>⋮ menu</strong> → <strong>Install app</strong> or <strong>Add to Home Screen</strong>
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-semibold text-foreground">💻 Desktop Chrome</p>
                  <p className="text-xs text-muted-foreground">
                    Click the <strong>install icon</strong> in the address bar or <strong>⋮ menu → Install</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Install;
