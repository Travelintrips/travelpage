import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import "./lib/i18n";
import { supabase } from "./lib/supabase";

// Initialize TempoDevtools conditionally
const initializeTempoDevtools = async () => {
  try {
    if (import.meta.env.VITE_TEMPO && typeof window !== "undefined") {
      const { TempoDevtools } = await import("tempo-devtools");
      if ((window as any).__REDUX_DEVTOOLS_EXTENSION__) {
        TempoDevtools.init();
      }
    }
  } catch (error) {
    console.warn("TempoDevtools not available:", error);
  }
};

// Call the initialization function
initializeTempoDevtools();

// Removed redundant global auth listener to prevent repeated authentication checks

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
