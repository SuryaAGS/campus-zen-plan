import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme } from "./lib/themeSettings";

// Apply saved theme on load
applyTheme();

createRoot(document.getElementById("root")!).render(<App />);
