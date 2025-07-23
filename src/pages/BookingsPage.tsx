import React, { useState, useEffect, useCallback, useRef } from "react";
import UserDashboard from "@/components/dashboard/UserDashboard";
import { useAuth } from "@/contexts/AuthContext";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";

const BookingsPage = () => {
  const {
    userEmail,
    userRole,
    userName,
    userId,
    isAuthenticated,
    isSessionReady,
    ensureSessionReady,
    isHydrated,
  } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced auth state checking with timeout and immediate localStorage restore
  const checkAuthState = useCallback(async () => {
    console.log("[BookingsPage] Checking auth state:", {
      isAuthenticated,
      userId,
      isSessionReady,
      isHydrated,
    });

    // Clear any existing timeout
    if (authCheckTimeoutRef.current) {
      clearTimeout(authCheckTimeoutRef.current);
      authCheckTimeoutRef.current = null;
    }

    // First, immediately check localStorage for instant restore
    const storedUser = localStorage.getItem("auth_user");
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");
    const storedUserRole = localStorage.getItem("userRole");

    if (storedUser && storedUserId && (!isAuthenticated || !userId)) {
      console.log(
        "[BookingsPage] Found stored auth data, triggering immediate restore",
      );
      try {
        const userData = JSON.parse(storedUser);
        if (userData && userData.id && userData.email) {
          // Create consistent user data object
          const consistentUserData = {
            id: userData.id,
            email: userData.email,
            role: storedUserRole || userData.role || "Customer",
            name:
              storedUserName ||
              userData.name ||
              userData.email?.split("@")[0] ||
              "User",
          };

          // Dispatch event to trigger AuthContext update
          window.dispatchEvent(
            new CustomEvent("forceSessionRestore", {
              detail: consistentUserData,
            }),
          );

          // Also dispatch session restored event
          window.dispatchEvent(
            new CustomEvent("sessionRestored", {
              detail: consistentUserData,
            }),
          );

          console.log(
            "[BookingsPage] Dispatched session restore events with data:",
            consistentUserData,
          );

          // Wait a bit for the restore to take effect
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.warn("[BookingsPage] Error parsing stored user data:", error);
      }
    }

    // If session is not ready and we have ensureSessionReady, try to ensure it's ready
    if (!isSessionReady && ensureSessionReady && !storedUser) {
      console.log("[BookingsPage] Session not ready, ensuring session...");
      try {
        const sessionReady = await ensureSessionReady();
        console.log("[BookingsPage] Session ready result:", sessionReady);
      } catch (error) {
        console.warn("[BookingsPage] Error ensuring session ready:", error);
      }
    }

    // Set timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log(
        "[BookingsPage] Auth check timeout reached, stopping loading",
      );
      setIsCheckingAuth(false);

      // Show auth modal only if we're sure there's no authentication after timeout
      if (!isAuthenticated && !userId && !storedUser) {
        setShowAuthModal(true);
      }
    }, 5000); // 5 second timeout

    authCheckTimeoutRef.current = timeout;

    // Stop checking if we have valid auth state
    if ((isAuthenticated && userId) || (storedUser && storedUserId)) {
      setIsCheckingAuth(false);
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
        authCheckTimeoutRef.current = null;
      }
    } else if (!storedUser && !isAuthenticated) {
      // Only show auth modal if no stored data and not authenticated
      setTimeout(() => {
        setIsCheckingAuth(false);
        setShowAuthModal(true);
      }, 1000);
    }
  }, [isAuthenticated, userId, isSessionReady, ensureSessionReady, isHydrated]);

  useEffect(() => {
    checkAuthState();

    return () => {
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
        authCheckTimeoutRef.current = null;
      }
    };
  }, [checkAuthState]);

  // Listen for session restore events with enhanced handling
  useEffect(() => {
    const handleSessionRestore = (event: CustomEvent) => {
      console.log(
        "[BookingsPage] Session restored event received:",
        event.detail,
      );
      setIsCheckingAuth(false);
      setShowAuthModal(false);

      // Clear any pending timeout
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
        authCheckTimeoutRef.current = null;
      }
    };

    const handleAuthStateRefresh = (event: CustomEvent) => {
      console.log(
        "[BookingsPage] Auth state refreshed event received:",
        event.detail,
      );
      setIsCheckingAuth(false);
      setShowAuthModal(false);

      // Clear any pending timeout
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
        authCheckTimeoutRef.current = null;
      }
    };

    // Listen for visibility change to trigger auth check when tab becomes visible
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        (!isAuthenticated || !userId)
      ) {
        console.log("[BookingsPage] Tab became visible, checking auth state");
        checkAuthState();
      }
    };

    window.addEventListener(
      "sessionRestored",
      handleSessionRestore as EventListener,
    );
    window.addEventListener(
      "authStateRefreshed",
      handleAuthStateRefresh as EventListener,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(
        "sessionRestored",
        handleSessionRestore as EventListener,
      );
      window.removeEventListener(
        "authStateRefreshed",
        handleAuthStateRefresh as EventListener,
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkAuthState, isAuthenticated, userId]);

  // Show loading while checking authentication with enhanced UI and timeout
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Loading your bookings...
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Please wait while we restore your session
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              If this takes too long, try refreshing the page
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback UI if session is not ready after timeout
  // Check if we have stored auth data
  const hasStoredAuth =
    localStorage.getItem("auth_user") && localStorage.getItem("userId");

  if (!isSessionReady && !isAuthenticated && !hasStoredAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Session Loading
            </h2>
            <p className="text-gray-600">
              Please wait while we prepare your dashboard
            </p>
          </div>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Check if we should show auth modal or dashboard
  const shouldShowDashboard = isAuthenticated && userId;

  // Show dashboard if authenticated or has stored auth
  if (shouldShowDashboard || hasStoredAuth) {
    return (
      <div className="min-h-screen bg-background">
        <UserDashboard />
      </div>
    );
  }

  // Fallback loading state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Preparing your dashboard...</p>
      </div>
    </div>
  );
};

export default BookingsPage;
