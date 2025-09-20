import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    role?: string;
    phone?: string;
  };
}

interface Session {
  user: User;
  access_token: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  userRole: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userPhone: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  isSessionReady: boolean;
  isCheckingSession: boolean;
  signOut: () => Promise<void>;
  forceRefreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  
  // FIXED: Use useRef instead of boolean
  const initializationRef = useRef(false);
  const isInitializingRef = useRef(false);

  const signOut = useCallback(async () => {
  try {
    console.log('[AuthContext] Starting complete signOut process...');
    
    // STEP 1: Set logout flag immediately for cross-tab sync
    const logoutTimestamp = Date.now().toString();
    sessionStorage.setItem("signOutInProgress", "true");
    sessionStorage.setItem("logoutTimestamp", logoutTimestamp);
    localStorage.setItem("logoutEvent", logoutTimestamp); // For cross-tab sync
    
    // STEP 2: Clear state immediately
    setUser(null);
    setSession(null);
    setRole(null);
    setIsLoading(false);
    setIsSessionReady(true);
    setIsHydrated(true);
    
    // STEP 3: Clear ALL storage completely
    const keysToKeep = ["signOutInProgress", "logoutTimestamp"];
    Object.keys(localStorage).forEach(key => {
      if (!keysToKeep.includes(key) && key !== "logoutEvent") {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach(key => {
      if (!keysToKeep.includes(key)) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('[AuthContext] State cleared, signing out from Supabase...');
    
    // STEP 4: Wait for Supabase signOut to complete fully (with hard timeout fallback)
    let eventReceived = false;
    await new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.log('[AuthContext] Supabase signOut timeout, proceeding...');
          resolved = true;
          resolve(true);
        }
      }, 3000);
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' && !resolved) {
          console.log('[AuthContext] SIGNED_OUT event received');
          eventReceived = true;
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolved = true;
          resolve(true);
        }
      });

      // Fallback if signOut does not trigger event
      supabase.auth.signOut({ scope: "global" }).then(({ error }) => {
        if (error && !resolved) {
          console.error('[AuthContext] Supabase signOut error:', error);
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolved = true;
          resolve(true);
        }
      });
    });
    
    // STEP 5: CRITICAL - Clear ALL logout flags after successful signOut
    console.log('[AuthContext] Clearing all logout flags after successful signOut...');
    sessionStorage.removeItem("signOutInProgress");
    sessionStorage.removeItem("loggedOut");
    sessionStorage.removeItem("forceLogout");
    sessionStorage.removeItem("logoutTimestamp");
    localStorage.removeItem("userLoggedOut");
    localStorage.removeItem("logoutEvent");
    
    console.log('[AuthContext] Supabase signOut completed, reloading page...');
    
    // STEP 6: Force complete reload after ensuring signOut is complete
    setTimeout(() => {
      window.location.href = window.location.origin;
    }, 100);
    
  } catch (error) {
    console.error("[AuthContext] Error signing out:", error);
    // CRITICAL: Force cleanup even on error and clear ALL flags
    localStorage.clear();
    sessionStorage.clear();
    console.log('[AuthContext] Cleared all storage due to signOut error');
    setTimeout(() => {
      window.location.href = window.location.origin;
    }, 100);
  }
}, []);

  const forceRefreshSession = useCallback(async () => {
    if (isInitializingRef.current) {
      console.log('[AuthContext] Already initializing, skipping refresh');
      return;
    }
    
    setIsCheckingSession(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session?.user) {
        const sessionUser = data.session.user;
        let userRole = sessionUser.user_metadata?.role || 'Customer';
        
        try {
          const { data: userData } = await supabase
            .from("users")
            .select("role, role_name")
            .eq("id", sessionUser.id)
            .single();

          if (userData) {
            userRole = userData.role || userData.role_name || userRole;
          }
        } catch (dbError) {
          console.warn("[AuthContext] Error fetching role:", dbError);
        }
        
        setUser(sessionUser);
        setSession(data.session);
        setRole(userRole);
        setIsLoading(false);
        setIsSessionReady(true);
        
        // Update localStorage
        localStorage.setItem("auth_user", JSON.stringify({
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || '',
          role: userRole,
          phone_number: sessionUser.user_metadata?.phone_number || ''
        }));
      } else {
        // Session invalid, clear everything
        setUser(null);
        setSession(null);
        setRole(null);
        setIsLoading(false);
        setIsSessionReady(true);
        localStorage.removeItem("auth_user");
      }
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  // FIXED: Enhanced initialization with forced logout flag cleanup
  useEffect(() => {
    const initializeAuth = async () => {
      if (isInitializingRef.current) {
        console.log('[AuthContext] Already initialized or initializing, skipping');
        return;
      }

      isInitializingRef.current = true;
      console.log('[AuthContext] Starting auth initialization...');

      try {
        // CRITICAL: Check and validate logout flags
        const loggedOut = sessionStorage.getItem("loggedOut");
        const forceLogout = sessionStorage.getItem("forceLogout");
        const signOutInProgress = sessionStorage.getItem("signOutInProgress");
        const userLoggedOut = localStorage.getItem("userLoggedOut");
        const logoutTimestamp = sessionStorage.getItem("logoutTimestamp");

        // If logout flags exist, check if they're stale (older than 10 seconds)
        const currentTime = Date.now();
        const isStaleLogout = logoutTimestamp && (currentTime - parseInt(logoutTimestamp)) > 10000;

        if (isStaleLogout) {
          console.log('[AuthContext] Detected stale logout flags, clearing them...');
          sessionStorage.removeItem("loggedOut");
          sessionStorage.removeItem("forceLogout");
          sessionStorage.removeItem("signOutInProgress");
          sessionStorage.removeItem("logoutTimestamp");
          localStorage.removeItem("userLoggedOut");
          localStorage.removeItem("logoutEvent");
        }

        // Re-check logout flags after cleanup
        const activeLoggedOut = sessionStorage.getItem("loggedOut");
        const activeForceLogout = sessionStorage.getItem("forceLogout");
        const activeSignOutInProgress = sessionStorage.getItem("signOutInProgress");
        const activeUserLoggedOut = localStorage.getItem("userLoggedOut");

        if (activeLoggedOut === "true" || activeForceLogout === "true" || activeSignOutInProgress === "true" || activeUserLoggedOut === "true") {
          console.log('[AuthContext] Active logout flags detected, ensuring signed out state');
          
          // Clear all auth data completely
          localStorage.removeItem("auth_user");
          localStorage.removeItem("userId");
          localStorage.removeItem("userRole");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userName");
          localStorage.removeItem("isAdmin");
          localStorage.removeItem("userPhone");
          
          setUser(null);
          setSession(null);
          setRole(null);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);
          isInitializingRef.current = false;
          return;
        }

        // CRITICAL: Always validate with Supabase first
        console.log('[AuthContext] Validating session with Supabase...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          // Clear any stale data on error and force clear logout flags
          localStorage.removeItem("auth_user");
          sessionStorage.removeItem("signOutInProgress");
          sessionStorage.removeItem("loggedOut");
          sessionStorage.removeItem("forceLogout");
          localStorage.removeItem("userLoggedOut");
          
          setUser(null);
          setSession(null);
          setRole(null);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);
          isInitializingRef.current = false;
          return;
        }

        // Check if session is valid and not expired
        if (session?.user && session.expires_at && session.expires_at > Date.now() / 1000) {
          console.log('[AuthContext] Valid session found:', session.user.id);
          
          // Clear any remaining logout flags since we have a valid session
          sessionStorage.removeItem("signOutInProgress");
          sessionStorage.removeItem("loggedOut");
          sessionStorage.removeItem("forceLogout");
          sessionStorage.removeItem("logoutTimestamp");
          localStorage.removeItem("userLoggedOut");
          localStorage.removeItem("logoutEvent");
          
          const sessionUser = session.user;
          let userRole = sessionUser.user_metadata?.role || 'Customer';
          let userPhone = sessionUser.user_metadata?.phone || '';

          // Get role and phone from database
          try {
            const { data: userData } = await supabase
              .from("users")
              .select("role, role_name, phone_number")
              .eq("id", sessionUser.id)
              .single();

            if (userData) {
              userRole = userData.role || userData.role_name || userRole;
              userPhone = userData.phone_number || userPhone;
            }
          } catch (dbError) {
            console.warn("[AuthContext] Error fetching role and phone:", dbError);
          }

          setUser(sessionUser);
          setSession(session);
          setRole(userRole);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);

          // Store in localStorage for persistence and cross-tab sync
          localStorage.setItem("auth_user", JSON.stringify({
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || '',
            role: userRole,
            phone: userPhone
          }));

          console.log("[AuthContext] User authenticated:", {
            userId: sessionUser.id,
            userRole: userRole,
            userPhone: userPhone
          });
        } else {
          console.log('[AuthContext] No valid session found, clearing all auth data');
          
          // Clear any stale localStorage data if no valid session
          localStorage.removeItem("auth_user");
          localStorage.removeItem("userId");
          localStorage.removeItem("userRole");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userName");
          localStorage.removeItem("isAdmin");
          localStorage.removeItem("userPhone");
          
          // Also clear any remaining logout flags
          sessionStorage.removeItem("signOutInProgress");
          sessionStorage.removeItem("loggedOut");
          sessionStorage.removeItem("forceLogout");
          sessionStorage.removeItem("logoutTimestamp");
          localStorage.removeItem("userLoggedOut");
          localStorage.removeItem("logoutEvent");
          
          setUser(null);
          setSession(null);
          setRole(null);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);
        }
      } catch (error) {
        console.error('[AuthContext] Error during initialization:', error);
        // Clear data on any error and force clear logout flags
        localStorage.removeItem("auth_user");
        sessionStorage.removeItem("signOutInProgress");
        sessionStorage.removeItem("loggedOut");
        sessionStorage.removeItem("forceLogout");
        localStorage.removeItem("userLoggedOut");
        
        setUser(null);
        setSession(null);
        setRole(null);
        setIsLoading(false);
        setIsSessionReady(true);
        setIsHydrated(true);
      } finally {
        isInitializingRef.current = false;
        console.log('[AuthContext] Session initialization completed.');
      }
    };

    initializeAuth();
  }, []);

  // FIXED: Enhanced auth state change listener with forced flag cleanup
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip during initialization
        if (isInitializingRef.current) {
          console.log('[AuthContext] Skipping auth state change during initialization');
          return;
        }

        console.log('[AuthContext] Auth state change:', event, session?.user?.id);

        // GUARD: Prevent duplicate SIGNED_IN events for the same user
        if (event === 'SIGNED_IN' && session?.user) {
          if (user?.id === session.user.id) {
            console.log('🔄 [AuthContext] Duplicate SIGNED_IN ignored for user:', session.user.id);
            return;
          }
          
          console.log('[AuthContext] SIGNED_IN detected - force clearing all logout flags');
          
          // Clear ALL logout flags immediately
          sessionStorage.removeItem("loggedOut");
          sessionStorage.removeItem("forceLogout");
          sessionStorage.removeItem("signOutInProgress");
          sessionStorage.removeItem("logoutTimestamp");
          localStorage.removeItem("userLoggedOut");
          localStorage.removeItem("logoutEvent");
          
          console.log('[AuthContext] All logout flags cleared for new sign in');
        }

        // Check remaining logout flags after cleanup
        const signOutInProgress = sessionStorage.getItem("signOutInProgress");
        const loggedOut = sessionStorage.getItem("loggedOut");
        const forceLogout = sessionStorage.getItem("forceLogout");
        const userLoggedOut = localStorage.getItem("userLoggedOut");

        // Handle SIGNED_OUT event - always process this
        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] Processing SIGNED_OUT event');
          
          setUser(null);
          setSession(null);
          setRole(null);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);
          
          // Clear auth storage
          localStorage.removeItem("auth_user");
          
          // CRITICAL: Clear logout flags after SIGNED_OUT is processed
          setTimeout(() => {
            sessionStorage.removeItem("signOutInProgress");
            sessionStorage.removeItem("loggedOut");
            sessionStorage.removeItem("forceLogout");
            sessionStorage.removeItem("logoutTimestamp");
            localStorage.removeItem("userLoggedOut");
            localStorage.removeItem("logoutEvent");
            console.log('[AuthContext] Logout flags cleared after SIGNED_OUT');
          }, 100);
          
          console.log('[AuthContext] Auth state cleared after sign out');
          return;
        }

        // Block other events only if logout flags still exist after cleanup attempt
        if ((signOutInProgress === "true" || loggedOut === "true" || forceLogout === "true" || userLoggedOut === "true")) {
          // For SIGNED_IN, allow it but with additional validation
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('[AuthContext] SIGNED_IN during logout flags - validating legitimacy');
            
            // Check if this is a legitimate new login by verifying timestamp
            const logoutTimestamp = sessionStorage.getItem("logoutTimestamp");
            const currentTime = Date.now();
            
            // If logout was more than 2 seconds ago or no timestamp, allow the sign in
            if (!logoutTimestamp || (currentTime - parseInt(logoutTimestamp)) > 2000) {
              console.log('[AuthContext] Allowing SIGNED_IN event - legitimate new login');
              
              // Force clear ALL logout flags again
              sessionStorage.removeItem("loggedOut");
              sessionStorage.removeItem("forceLogout");
              sessionStorage.removeItem("signOutInProgress");
              sessionStorage.removeItem("logoutTimestamp");
              localStorage.removeItem("userLoggedOut");
              localStorage.removeItem("logoutEvent");
              
              // Process the sign in normally - continue below
            } else {
              console.log('[AuthContext] BLOCKING SIGNED_IN - too soon after logout');
              return;
            }
          } else {
            console.log('[AuthContext] BLOCKING auth event during logout:', event);
            // Force logout state immediately
            setUser(null);
            setSession(null);
            setRole(null);
            setIsLoading(false);
            setIsSessionReady(true);
            setIsHydrated(true);
            return;
          }
        }

        // Handle SIGNED_IN event
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[AuthContext] Processing SIGNED_IN event:', session.user.id);
          
          const sessionUser = session.user;
          let userRole = sessionUser.user_metadata?.role || 'Customer';
          let userPhone = sessionUser.user_metadata?.phone || '';
          
          // Get role and phone from database
          try {
            const { data: userData } = await supabase
              .from("users")
              .select("role, role_name, phone_number")
              .eq("id", sessionUser.id)
              .single();

            if (userData) {
              userRole = userData.role || userData.role_name || userRole;
              userPhone = userData.phone_number || userPhone;
            }
          } catch (dbError) {
            console.warn("[AuthContext] Error fetching role and phone:", dbError);
          }
          
          setUser(sessionUser);
          setSession(session);
          setRole(userRole);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);
          
          // Store in localStorage for persistence
          localStorage.setItem("auth_user", JSON.stringify({
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || '',
            role: userRole,
            phone: userPhone
          }));
          
          console.log("[AuthContext] User signed in:", {
            userId: sessionUser.id,
            userRole: userRole,
            userPhone: userPhone
          });
          
          return;
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[AuthContext] Token refreshed');
          setSession(session);
        }
      }
    );

    return () => {
      console.log('[AuthContext] Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [user]); // Add user as dependency to access current user for duplicate check

  // FIXED: Enhanced visibility change handler with strict session validation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isSessionReady && !isInitializingRef.current) {
        console.log('[AuthContext] Tab became visible, checking session state...');
        
        // Check ALL logout flags first
        const signOutInProgress = sessionStorage.getItem("signOutInProgress");
        const loggedOut = sessionStorage.getItem("loggedOut");
        const forceLogout = sessionStorage.getItem("forceLogout");
        const userLoggedOut = localStorage.getItem("userLoggedOut");
        
        if (signOutInProgress === "true" || loggedOut === "true" || forceLogout === "true" || userLoggedOut === "true") {
          console.log('[AuthContext] Logout detected on tab focus, maintaining logout state');
          // Ensure logout state is maintained
          setUser(null);
          setSession(null);
          setRole(null);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);
          
          // Clear any stale auth data
          localStorage.removeItem("auth_user");
          return;
        }
        
        // CRITICAL: Always validate session with Supabase on tab focus
        const validateSession = async () => {
          try {
            console.log('[AuthContext] Validating Supabase session...');
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('[AuthContext] Session validation error:', error);
              // Clear user state on error
              setUser(null);
              setSession(null);
              setRole(null);
              localStorage.removeItem("auth_user");
              return;
            }
            
            if (session?.user && session.expires_at && session.expires_at > Date.now() / 1000) {
              console.log('[AuthContext] Valid Supabase session found');
              
              // Only restore if we don't have current user or if user data differs
              if (!user || user.id !== session.user.id) {
                const storedUser = localStorage.getItem("auth_user");
                if (storedUser) {
                  try {
                    const userData = JSON.parse(storedUser);
                    // Verify stored user matches session user
                    if (userData.id === session.user.id) {
                      console.log('[AuthContext] Restoring user from validated session');
                      setUser({
                        id: userData.id,
                        email: userData.email,
                        user_metadata: {
                          name: userData.name,
                          role: userData.role,
                          phone: userData.phone || "",
                        },
                      });
                      setRole(userData.role);
                      setSession(session);
                    } else {
                      console.log('[AuthContext] Stored user mismatch, clearing data');
                      localStorage.removeItem("auth_user");
                      setUser(null);
                      setSession(null);
                      setRole(null);
                    }
                  } catch (error) {
                    console.warn('[AuthContext] Error parsing stored user:', error);
                    localStorage.removeItem("auth_user");
                    setUser(null);
                    setSession(null);
                    setRole(null);
                  }
                }
              }
            } else {
              console.log('[AuthContext] No valid Supabase session, clearing user state');
              // Clear user state if no valid session
              setUser(null);
              setSession(null);
              setRole(null);
              localStorage.removeItem("auth_user");
              
              // Clear any other auth-related localStorage items
              localStorage.removeItem("userId");
              localStorage.removeItem("userRole");
              localStorage.removeItem("userEmail");
              localStorage.removeItem("userName");
              localStorage.removeItem("isAdmin");
              localStorage.removeItem("userPhone");
            }
          } catch (error) {
            console.error('[AuthContext] Error validating session on tab focus:', error);
            // On error, clear user state to be safe
            setUser(null);
            setSession(null);
            setRole(null);
            localStorage.removeItem("auth_user");
          }
        };
        
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSessionReady, user]);

  // FIXED: Enhanced cross-tab logout synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Handle cross-tab logout synchronization
      if (e.key === "logoutEvent" && e.newValue) {
        console.log('[AuthContext] Logout detected in another tab, syncing...');
        
        // Clear current state immediately
        setUser(null);
        setSession(null);
        setRole(null);
        setIsLoading(false);
        setIsSessionReady(true);
        setIsHydrated(true);
        
        // Set logout flags
        sessionStorage.setItem("loggedOut", "true");
        sessionStorage.setItem("forceLogout", "true");
        
        // Clear all auth data
        localStorage.removeItem("auth_user");
        
        console.log('[AuthContext] Cross-tab logout sync completed');
        
        // Force reload to ensure clean state
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 500);
      }
      
      // Handle cross-tab login synchronization
      if (e.key === "auth_user" && e.newValue && !user) {
        console.log('[AuthContext] Login detected in another tab, checking session...');
        
        // Only sync if no logout flags are set
        const loggedOut = sessionStorage.getItem("loggedOut");
        const forceLogout = sessionStorage.getItem("forceLogout");
        
        if (loggedOut !== "true" && forceLogout !== "true") {
          // Validate with Supabase before syncing
          const validateAndSync = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session?.user) {
                const userData = JSON.parse(e.newValue);
                console.log('[AuthContext] Syncing login from another tab');
                
                setUser({
                  id: userData.id,
                  email: userData.email,
                  user_metadata: {
                    name: userData.name,
                    role: userData.role,
                    phone: userData.phone || "",
                  },
                });
                setRole(userData.role);
                setSession(session);
              }
            } catch (error) {
              console.warn('[AuthContext] Error syncing login from another tab:', error);
            }
          };
          
          validateAndSync();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  // Computed values for compatibility
  const isAuthenticated = !!user && !!session;
  const userId = user?.id || null;
  const userEmail = user?.email || null;
  const userName = user?.user_metadata?.name || userEmail?.split('@')[0] || null;
  const userPhone = user?.user_metadata?.phone || null;
  const isAdmin = role === 'Admin' || role === 'Super Admin' || role === 'Staff Admin';

  const value: AuthContextType = {
    user,
    session,
    role,
    userRole: role, // Alias for compatibility
    userId,
    userEmail,
    userName,
    userPhone,
    isAdmin,
    isAuthenticated,
    isLoading,
    isHydrated,
    isSessionReady,
    isCheckingSession,
    signOut,
    forceRefreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};