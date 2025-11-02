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
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@radix-ui/react-select",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-switch",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
    ],
  },

  plugins: [react(), tempo()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-dom": "react-dom",
    },
  },
  css: {
    // Fix CSS access issues for Tempo devtools
    devSourcemap: true,
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  },
  define: {
    global: "globalThis",
    "process.env.NODE_DEBUG": "false",
    // Fix for React 18 compatibility with Radix UI
    __REACT_DEVTOOLS_GLOBAL_HOOK__: JSON.stringify({ isDisabled: true }),
    // Enhanced environment variable handling for Vercel
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "",
    ),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
    ),
    "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
        process.env.NEXT_PUBLIC_MAPBOX_API_KEY ||
        "",
    ),
    "import.meta.env.VITE_TEMPO": JSON.stringify(
      process.env.VITE_TEMPO || process.env.TEMPO || "false",
    ),
    // Support legacy process.env syntax with fallbacks
    "process.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "",
    ),
    "process.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
    ),
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development",
    ),
  },
  server: {
    // @ts-ignore
    allowedHosts: process.env.TEMPO === "true" ? true : undefined,
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
    chunkSizeWarningLimit: 800,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: ["fs", "path", "os"],
      output: {
        globals: {
          fs: "fs",
          path: "path",
          os: "os",
          net: "net",
          tls: "tls",
          assert: "assert",
          url: "url",
          "node:events": "events",
          "node:process": "process",
          "node:util": "util",
          stream: "stream",
          util: "util",
          crypto: "crypto",
          http: "http",
          https: "https",
          buffer: "Buffer",
        },
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router", "react-router-dom"],
          "radix-core": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
          ],
          "radix-forms": [
            "@radix-ui/react-checkbox",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-switch",
            "@radix-ui/react-slider",
            "@radix-ui/react-label",
          ],
          "radix-layout": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-tabs",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-separator",
            "@radix-ui/react-scroll-area",
          ],
          "radix-feedback": [
            "@radix-ui/react-toast",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-progress",
            "@radix-ui/react-hover-card",
          ],
          "radix-navigation": [
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-menubar",
            "@radix-ui/react-context-menu",
          ],
          "radix-media": [
            "@radix-ui/react-avatar",
            "@radix-ui/react-aspect-ratio",
          ],
          icons: [
            "lucide-react",
            "@radix-ui/react-icons",
            "@fortawesome/fontawesome-svg-core",
            "@fortawesome/free-solid-svg-icons",
            "@fortawesome/react-fontawesome",
          ],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          supabase: ["@supabase/supabase-js"],
          maps: ["@react-google-maps/api", "mapbox-gl"],
          datetime: [
            "date-fns",
            "dayjs",
            "react-day-picker",
            "react-time-picker",
          ],
          animation: ["framer-motion", "embla-carousel-react"],
          charts: ["recharts"],
          i18n: [
            "i18next",
            "i18next-browser-languagedetector",
            "react-i18next",
          ],
          ai: ["face-api.js"],
          "ui-utils": [
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
            "tailwindcss-animate",
            "cmdk",
            "vaul",
            "react-resizable-panels",
          ],
          utils: ["axios", "uuid", "react-select"],
        },
      },
    },
  },
});