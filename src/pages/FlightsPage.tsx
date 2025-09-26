import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";
import { Button } from "@/components/ui/button";
import {
  Car,
  MapPin,
  ArrowLeft,
  Plane,
  Clock,
  Shield,
  Star,
} from "lucide-react";

const FlightsPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  // Check for forced logout and authentication
  useEffect(() => {
    const forceLogout = sessionStorage.getItem("forceLogout");
    if (forceLogout) {
      // Clear the flag to prevent loops
      sessionStorage.removeItem("forceLogout");

      // Clear any remaining auth tokens
      try {
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("sb-refresh-token");
        localStorage.removeItem("sb-access-token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("userId");
        localStorage.removeItem("userRole");
      } catch (e) {
        console.warn("Error clearing auth tokens:", e);
      }
    }

    // If not authenticated and not loading, show auth modal
    if (!isLoading && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, isLoading]);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
      <Button
        variant="ghost"
        className="text-green hover:bg-green-700 mr-4"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back To Home
      </Button>
    </div>
        <h1 className="text-3xl font-bold mb-6">Flights</h1>
        <p className="text-gray-600">
          Search and book flights to your destination.
        </p>
        {/* Flight content will be implemented here */}
      </div>

      {/* Auth modal for protected actions */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default FlightsPage;
