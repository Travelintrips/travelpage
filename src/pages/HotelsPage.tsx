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
import { useTranslation } from "react-i18next";



const HotelsPage = () => {
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
  <div className="container mx-auto px-4">
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

    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">Hotels</h1>
      <p className="text-gray-600 mb-8">
        Find and book the perfect hotel for your stay.
      </p>

      {/* Coming Soon section */}
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-6xl mb-4">🏨</span>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Coming Soon
        </h2>
        <p className="text-gray-500 max-w-md">
          We’re working hard to bring you the best hotel booking experience.
          Stay tuned!
        </p>
      </div>
    </div>

    {/* Auth modal for protected actions */}
    <AuthRequiredModal
      isOpen={showAuthModal}
      onClose={() => setShowAuthModal(false)}
    />
  </div>
</div>

  );
};


export default HotelsPage;
