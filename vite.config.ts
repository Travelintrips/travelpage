import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { tempo } from "tempo-devtools/dist/vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  optimizeDeps: {
    entries: ["src/main.tsx", "src/tempobook/**/*"],
    force: true,
  },
  plugins: [react(), tempo()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL || "",
    ),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || "",
    ),
    "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(
      process.env.VITE_GOOGLE_MAPS_API_KEY || "",
    ),
    "import.meta.env.VITE_TEMPO": JSON.stringify(
      process.env.VITE_TEMPO || process.env.TEMPO || "false",
    ),
    "process.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL || "",
    ),
    "process.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || "",
    ),
  },
  server: {
    allowedHosts: true,
    hmr: {
      protocol: process.env.TEMPO === "true" ? "wss" : "ws",
    },
    fs: {
      strict: false,
    },
    middlewareMode: false,
    setupMiddlewares: async (middlewares) => {
      try {
        const history = await import("connect-history-api-fallback");
        middlewares.use(
          history.default({
            rewrites: [{ from: /^\/.*$/, to: "/index.html" }],
          }),
        );
      } catch (err) {
        console.warn(
          "⚠️ 'connect-history-api-fallback' not found, skipping fallback middleware.",
        );
      }
      return middlewares;
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          react: ["react", "react-dom"],
          // Router
          router: ["react-router", "react-router-dom"],
          // UI libraries
          ui: [
            "lucide-react",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
          ],
          // Form libraries
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          // Supabase
          supabase: ["@supabase/supabase-js"],
          // Maps and external APIs
          maps: ["@react-google-maps/api"],
          // Utilities
          utils: [
            "axios",
            "date-fns",
            "dayjs",
            "uuid",
            "clsx",
            "tailwind-merge",
          ],
        },
      },
    },
  },
});
