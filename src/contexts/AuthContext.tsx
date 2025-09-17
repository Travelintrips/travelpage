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
      
      // CRITICAL: Set logout flag FIRST to prevent auto-recovery
      sessionStorage.setItem("loggedOut", "true");
      
      // FIXED: Clear state immediately and prevent any recovery attempts
      setUser(null);
      setSession(null);
      setRole(null);
      setIsLoading(false);
      setIsSessionReady(true);
      setIsHydrated(true);
      
      // FIXED: Clear ALL auth-related storage data immediately
      localStorage.removeItem("auth_user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("userPhone");
      
      // Clear all Supabase auth storage keys
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      supabaseKeys.forEach(key => localStorage.removeItem(key));
      
      // Sign out from Supabase with global scope
      await supabase.auth.signOut({ scope: "global" });
      
      console.log('[AuthContext] User signed out successfully - state cleared');
      
      // FIXED: Don't reload immediately, let the auth state change handle it
      
    } catch (error) {
      console.error("[AuthContext] Error signing out:", error);
      
      // Even if there's an error, ensure complete cleanup
      sessionStorage.setItem("loggedOut", "true");
      setUser(null);
      setSession(null);
      setRole(null);
      setIsLoading(false);
      setIsSessionReady(true);
      setIsHydrated(true);
      
      // Force clear all storage
      localStorage.clear();
      sessionStorage.setItem("loggedOut", "true"); // Keep only logout flag
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
          phone: sessionUser.user_metadata?.phone || ''
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

  // FIXED: Initialize session with better race condition handling
  useEffect(() => {
    const initializeSession = async () => {
      // Prevent multiple simultaneous initializations
      if (initializationRef.current || isInitializingRef.current) {
        console.log('[AuthContext] Already initialized or initializing, skipping');
        return;
      }
      
      initializationRef.current = true;
      isInitializingRef.current = true;

      console.log('[AuthContext] Initializing session...');

      // CRITICAL: Check logout flag first
      const loggedOut = sessionStorage.getItem("loggedOut");
      if (loggedOut === "true") {
        console.log('[AuthContext] Logout flag detected, clearing all auth state');
        
        // Clear everything and don't attempt recovery
        setUser(null);
        setSession(null);
        setRole(null);
        setIsLoading(false);
        setIsHydrated(true);
        setIsSessionReady(true);
        
        // Clear any remaining auth data
        localStorage.removeItem("auth_user");
        const supabaseKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || key.includes('supabase')
        );
        supabaseKeys.forEach(key => localStorage.removeItem(key));
        
        isInitializingRef.current = false;
        return;
      }

      try {
        // FIXED: Load from localStorage immediately for instant UI
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('[AuthContext] Loading cached user data for instant UI');
            
            // Set user data immediately for UI - NO LOADING STATE
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
            setSession({
              user: userData,
              access_token: "cached_token",
            });
            setIsLoading(false);
            setIsSessionReady(true);
            setIsHydrated(true);
            
            console.log('[AuthContext] User loaded from cache, UI ready immediately');
          } catch (parseError) {
            console.warn("[AuthContext] Error parsing stored user:", parseError);
            localStorage.removeItem("auth_user");
          }
        }

        // Background verification with Supabase (don't show loading)
        console.log('[AuthContext] Background verification with Supabase...');
        const { data, error } = await supabase.auth.getSession();

        if (!error && data?.session?.user) {
          console.log('[AuthContext] Valid Supabase session found, updating silently');
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
          
          // Update with fresh Supabase data (silently)
          setUser(sessionUser);
          setSession(data.session);
          setRole(userRole);
          
          // Update localStorage with fresh data
          localStorage.setItem("auth_user", JSON.stringify({
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || '',
            role: userRole,
            phone: sessionUser.user_metadata?.phone || ''
          }));
        } else if (!storedUser) {
          // No session and no stored user
          console.log('[AuthContext] No session found, user not authenticated');
          setUser(null);
          setSession(null);
          setRole(null);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);
        }
      } catch (err) {
        console.warn("[AuthContext] Session initialization error:", err);
        
        // Fallback to localStorage if available
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
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
            setSession({
              user: userData,
              access_token: "fallback_token",
            });
          } catch (parseError) {
            console.warn("[AuthContext] Error parsing stored user:", parseError);
            localStorage.removeItem("auth_user");
            setUser(null);
            setSession(null);
            setRole(null);
          }
        }
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
        setIsSessionReady(true);
        isInitializingRef.current = false;
        console.log('[AuthContext] Session initialization completed');
      }
    };

    initializeSession();
  }, []);

  // FIXED: Listen for auth state changes from Supabase with better logout handling
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Prevent processing during initialization
        if (isInitializingRef.current) {
          console.log('[AuthContext] Skipping auth state change during initialization');
          return;
        }
        
        console.log('[AuthContext] Auth state change:', event, session?.user?.id);
        
        // CRITICAL: Check logout flag first
        const loggedOut = sessionStorage.getItem("loggedOut");
        if (loggedOut === "true" && event !== 'SIGNED_OUT') {
          console.log('[AuthContext] Logout flag detected, ignoring auth state change');
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          // CRITICAL: Clear logout flag on successful sign in
          sessionStorage.removeItem("loggedOut");
          
          const sessionUser = session.user;
          let userRole = sessionUser.user_metadata?.role || 'Customer';
          
          // Get role from database
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
            phone: sessionUser.user_metadata?.phone || ''
          }));
          
          console.log("[AuthContext] User signed in:", {
            userId: sessionUser.id,
            userRole: userRole
          });
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out via auth state change');
          
          // FIXED: Ensure complete state cleanup on sign out
          setUser(null);
          setSession(null);
          setRole(null);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);
          
          // Clear all auth storage
          localStorage.removeItem("auth_user");
          localStorage.removeItem("userId");
          localStorage.removeItem("userRole");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userName");
          localStorage.removeItem("isAdmin");
          localStorage.removeItem("userPhone");
          
          console.log('[AuthContext] Auth state cleared after sign out');
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[AuthContext] Token refreshed');
          setSession(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // FIXED: Add visibility change handler with better logout flag handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isSessionReady && !isInitializingRef.current) {
        console.log('[AuthContext] Tab became visible, checking session validity...');
        
        // CRITICAL: Check logout flag first
        const loggedOut = sessionStorage.getItem("loggedOut");
        if (loggedOut === "true") {
          console.log('[AuthContext] Logout flag detected, preventing session restoration');
          // Ensure user is signed out
          setUser(null);
          setSession(null);
          setRole(null);
          setIsLoading(false);
          setIsSessionReady(true);
          setIsHydrated(true);
          return;
        }
        
        // Only restore session if no logout flag and no current user
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser && !user) {
          console.log('[AuthContext] Restoring user from cache after tab switch');
          try {
            const userData = JSON.parse(storedUser);
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
            setSession({
              user: userData,
              access_token: "restored_token",
            });
          } catch (error) {
            console.warn('[AuthContext] Error restoring user from cache:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSessionReady, user]);

  // Computed values for compatibility
  const isAuthenticated = !!user && !!session;
  const userId = user?.id || null;
  const userEmail = user?.email || null;
  const userName = user?.user_metadata?.name || userEmail?.split('@')[0] || null;
  const isAdmin = role === 'Admin' || role === 'Super Admin' || role === 'Staff Admin';

  const value: AuthContextType = {
    user,
    session,
    role,
    userRole: role, // Alias for compatibility
    userId,
    userEmail,
    userName,
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