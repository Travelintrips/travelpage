import React, { useEffect, useState } from "react";
import UserDashboard from "@/components/dashboard/UserDashboard";
import { useAuth } from "@/contexts/AuthContext";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";

const BookingAndProfileUserPage = () => {
  const { isAuthenticated, isLoading, userEmail, userRole, userName, isSessionReady } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Wait for session to be ready before checking authentication
    if (!isSessionReady) return;

    if (!isAuthenticated && !isLoading) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [isAuthenticated, isLoading, isSessionReady]);

  // Show loading state while checking authentication
  if (!isSessionReady || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? (
        <UserDashboard />
      ) : (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Please log in to view your bookings and profile
            </h1>
            <p className="text-gray-600">
              You need to be logged in to access this page.
            </p>
          </div>
        </div>
      )}
      
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Please log in to view your bookings and profile."
      />
    </div>
  );
};

export default BookingAndProfileUserPage;