import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to force redirect to login page when user is not authenticated
 * @param {boolean} requireAuth - Whether authentication is required for this page
 * @param {string} redirectPath - Path to redirect to if not authenticated
 * @param {boolean} checkAdmin - Whether to check if user is admin
 */
export const useForceLogoutRedirect = (
  requireAuth: boolean = false,
  redirectPath: string = "/login",
  checkAdmin: boolean = false,
) => {
  const { isAuthenticated, isLoading, isAdmin, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for forced logout
    const forceLogout = sessionStorage.getItem("forceLogout");
    if (forceLogout) {
      console.log("Force logout detected, clearing flag");
      sessionStorage.removeItem("forceLogout");

      // Clear any remaining auth tokens
      try {
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("sb-refresh-token");
        localStorage.removeItem("sb-access-token");
        localStorage.removeItem("sb-auth-token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("userId");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("supabase.auth.data");
        localStorage.removeItem("supabase.auth.expires_at");
        localStorage.removeItem("supabase.auth.expires_in");
        localStorage.removeItem("supabase.auth.refresh_token");
        localStorage.removeItem("supabase.auth.access_token");
        localStorage.removeItem("driverData");
      } catch (e) {
        console.warn("Error clearing auth tokens:", e);
      }
    }

    // Check for loggedOut flag to prevent redirect loops
    const loggedOut = sessionStorage.getItem("loggedOut");
    if (loggedOut) {
      console.log("Logged out flag detected, not redirecting");
      sessionStorage.removeItem("loggedOut");
      return;
    }

    // Only redirect if loading is complete and authentication is required
    if (!isLoading && requireAuth) {
      if (!isAuthenticated) {
        console.log(`Not authenticated, redirecting to ${redirectPath}`);
        navigate(redirectPath, { replace: true });
      } else if (checkAdmin && !isAdmin && userRole !== "Admin") {
        console.log("Not admin, redirecting to home");
        navigate("/", { replace: true });
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    isAdmin,
    userRole,
    navigate,
    requireAuth,
    redirectPath,
    checkAdmin,
  ]);

  return { isAuthenticated, isLoading, isAdmin };
};

export default useForceLogoutRedirect;
