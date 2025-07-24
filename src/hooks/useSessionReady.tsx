import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";

/**
 * Custom hook to check if the session is ready for use
 * Returns session readiness status and user information
 * Provides additional utilities for booking operations
 */
export const useSessionReady = () => {
  const {
    isAuthenticated,
    userId,
    userEmail,
    userName,
    userRole,
    isLoading,
    isHydrated,
    isSessionReady,
    ensureSessionReady,
  } = useAuth();

  const [isWaitingForSession, setIsWaitingForSession] = useState(false);

  // Session is considered ready when:
  // 1. Auth context is hydrated (initial load complete)
  // 2. Session state is ready (no pending operations)
  // 3. Not currently loading
  // 4. If authenticated, must have userId
  const sessionReady =
    isHydrated &&
    isSessionReady &&
    !isLoading &&
    (!isAuthenticated || (isAuthenticated && userId));

  /**
   * Wait for session to be ready with timeout
   * Useful for booking operations that require valid session
   */
  const waitForSessionReady = useCallback(
    async (timeoutMs: number = 5000): Promise<boolean> => {
      if (sessionReady) {
        return true;
      }

      setIsWaitingForSession(true);

      try {
        // Ensure session is initialized
        await ensureSessionReady();

        // Wait for session to be ready with timeout
        const startTime = Date.now();

        while (!sessionReady && Date.now() - startTime < timeoutMs) {
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Check if session became ready
          if (isHydrated && isSessionReady && !isLoading) {
            setIsWaitingForSession(false);
            return true;
          }
        }

        console.warn(
          "[useSessionReady] Session ready timeout reached, forcing ready state",
        );
        // Force ready state after timeout to prevent infinite loading
        setIsWaitingForSession(false);
        return isHydrated; // Return true if at least hydrated
      } catch (error) {
        console.error("[useSessionReady] Error waiting for session:", error);
        setIsWaitingForSession(false);
        return isHydrated; // Return true if at least hydrated
      }
    },
    [sessionReady, ensureSessionReady, isHydrated, isSessionReady, isLoading],
  );

  /**
   * Check if user can perform booking operations
   * Returns true if session is ready and user is authenticated
   */
  const canPerformBooking = sessionReady && isAuthenticated && userId;

  /**
   * Check if user can perform guest operations
   * Returns true if session is ready (regardless of authentication)
   */
  const canPerformGuestOperation = sessionReady;

  // Log session state changes for debugging
  useEffect(() => {
    console.log("[useSessionReady] Session state:", {
      sessionReady,
      isAuthenticated,
      userId: !!userId,
      isHydrated,
      isSessionReady,
      isLoading,
      canPerformBooking,
      canPerformGuestOperation,
    });
  }, [
    sessionReady,
    isAuthenticated,
    userId,
    isHydrated,
    isSessionReady,
    isLoading,
    canPerformBooking,
    canPerformGuestOperation,
  ]);

  return {
    // Core session status
    isSessionReady: sessionReady,
    isAuthenticated,
    userId,
    userEmail,
    userName,
    userRole,
    isLoading,
    isWaitingForSession,

    // Utility functions
    waitForSessionReady,
    ensureSessionReady,

    // Operation permissions
    canPerformBooking,
    canPerformGuestOperation,

    // Detailed state for debugging
    sessionState: {
      isHydrated,
      isSessionReady,
      isLoading,
      hasUserId: !!userId,
    },
  };
};
