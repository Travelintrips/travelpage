import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Get environment variables with fallbacks and validation
const getEnvVar = (key: string, fallback: string = ""): string => {
  // Vite Runtime
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env[key]
  ) {
    return import.meta.env[key];
  }

  // Node / SSR
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }

  // Browser runtime injected
  if (typeof window !== "undefined" && (window as any).__ENV__?.[key]) {
    return (window as any).__ENV__[key];
  }

  return fallback;
};

const supabaseUrl = getEnvVar(
  "VITE_SUPABASE_URL",
  "https://placeholder-project.supabase.co",
);
const supabaseAnonKey = getEnvVar("VITE_SUPABASE_ANON_KEY", "placeholder-key");

// Validate URL format before using it
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Debug logging for environment variables
{/*console.log("Supabase configuration:", {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : "undefined",
  key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : "undefined",
  isValidUrl: isValidUrl(supabaseUrl),
  env: {
    importMeta: (() => {
      try {
        return import.meta && import.meta.env ? "available" : "unavailable";
      } catch (e) {
        return "unavailable";
      }
    })(),
    processEnv:
      typeof process !== "undefined" && process.env
        ? "available"
        : "unavailable",
    windowEnv:
      typeof window !== "undefined" && (window as any).__ENV__
        ? "available"
        : "unavailable",
  },
}); */}

const hasValidCredentials =
  supabaseUrl &&
  supabaseAnonKey &&
  isValidUrl(supabaseUrl) &&
  supabaseUrl !== "https://placeholder-project.supabase.co" &&
  supabaseAnonKey !== "placeholder-key";

let supabase: any;

if (hasValidCredentials) {
 {/* console.log("Using Supabase URL:", supabaseUrl);*/}
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        "X-Client-Info": "supabase-js-web",
      },
    },
  });
} else {
  console.warn(
    "Using mock Supabase client. Database operations will not work.",
  );

  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () =>
        Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
        error: null,
      }),
      signOut: () => Promise.resolve({ error: null }),
      signUp: (params) => {
        const mockUser = {
          id: "mock-user-id-" + Date.now(),
          email: params.email,
          user_metadata: params.options?.data || {},
        };
        return Promise.resolve({
          data: { user: mockUser, session: { user: mockUser } },
          error: null,
        });
      },
      signInWithPassword: (params) => {
        const mockUser = {
          id: "mock-user-id-" + Date.now(),
          email: params.email,
          user_metadata: { role: "User" },
        };
        return Promise.resolve({
          data: { user: mockUser, session: { user: mockUser } },
          error: null,
        });
      },
    },
    from: () => ({
      select: () => ({
        data: [],
        error: null,
        order() {
          return this;
        },
        eq() {
          return this;
        },
        neq() {
          return this;
        },
        gt() {
          return this;
        },
        lt() {
          return this;
        },
        gte() {
          return this;
        },
        lte() {
          return this;
        },
        like() {
          return this;
        },
        ilike() {
          return this;
        },
        is() {
          return this;
        },
        in() {
          return this;
        },
        contains() {
          return this;
        },
        containedBy() {
          return this;
        },
        rangeLt() {
          return this;
        },
        rangeGt() {
          return this;
        },
        rangeGte() {
          return this;
        },
        rangeLte() {
          return this;
        },
        rangeAdjacent() {
          return this;
        },
        overlaps() {
          return this;
        },
        textSearch() {
          return this;
        },
        filter() {
          return this;
        },
        match() {
          return this;
        },
        limit() {
          return this;
        },
        single() {
          return { data: null, error: null };
        },
        maybeSingle() {
          return { data: null, error: null };
        },
      }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      upsert: () => ({ data: null, error: null }),
    }),
    storage: {
      from: () => ({
        upload: () =>
          Promise.resolve({ data: { path: "mock-path" }, error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: "https://example.com/mock-image.jpg" },
          error: null,
        }),
      }),
    },
    functions: {
      invoke: (functionName, options) => {
        console.log(`Mock function invoke: ${functionName}`, options);
        return Promise.resolve({ data: { success: true }, error: null });
      },
    },
  };
}

export { supabase };
