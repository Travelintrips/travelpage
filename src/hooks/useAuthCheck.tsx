import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Custom hook for checking authentication status with localStorage support
function useAuthCheck() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check localStorage for shared authentication
        const authUser = localStorage.getItem("auth_user");
        if (authUser) {
          const userData = JSON.parse(authUser);
          setIsAuthenticated(true);
          setUserId(userData.id);
          setUserRole(userData.role);
          setUserEmail(userData.email);
          setIsLoading(false);
          return;
        }

        // If not in localStorage, check Supabase session
        const { data } = await supabase.auth.getSession();
        setIsAuthenticated(!!data.session);

        // If authenticated via Supabase but not in localStorage, store the data
        if (data.session) {
          const userId = data.session.user.id;
          setUserId(userId);
          localStorage.setItem("userId", userId);

          // Try to get user role from metadata or default to "Customer"
          const userRole = data.session.user.user_metadata?.role || "Customer";
          setUserRole(userRole);
          localStorage.setItem("userRole", userRole);

          // Store email if available
          if (data.session.user.email) {
            setUserEmail(data.session.user.email);
            localStorage.setItem("userEmail", data.session.user.email);
          }

          // Store in auth_user for shared authentication
          const userData = {
            id: userId,
            role: userRole,
            email: data.session.user.email || "",
          };
          localStorage.setItem("auth_user", JSON.stringify(userData));
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Function to handle authentication state changes
  const handleAuthStateChange = (state: boolean) => {
    setIsAuthenticated(state);

    if (state) {
      // Get user data from localStorage if available
      const userId = localStorage.getItem("userId");
      const userRole = localStorage.getItem("userRole");
      const userEmail = localStorage.getItem("userEmail");

      setUserId(userId);
      setUserRole(userRole);
      setUserEmail(userEmail);

      // Store user data in localStorage for shared authentication
      if (userId && userRole) {
        const userData = {
          id: userId,
          role: userRole,
          email: userEmail || "",
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));
      }
    } else {
      // Clear state and localStorage on logout
      setUserId(null);
      setUserRole(null);
      setUserEmail(null);

      // Remove user data from localStorage on logout
      localStorage.removeItem("auth_user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
    }
  };

  // Function to sign out
  /*  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      handleAuthStateChange(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };*/

  return {
    isAuthenticated,
    userRole,
    userId,
    userEmail,
    isLoading,
    handleAuthStateChange,
    //  signOut,
  };
}

export default useAuthCheck;
