import React, { useState, useEffect } from "react";
import {
  useLocation,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";
import BookingForm from "../components/booking/BookingForm";
import { Card } from "../components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { selectedVehicle } = location.state || {};
  const { isAuthenticated, userId, isSessionReady } = useAuth();

  const [vehicle, setVehicle] = useState(selectedVehicle || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ✅ Tampilkan modal login hanya jika session sudah siap
  useEffect(() => {
    if (isSessionReady && (!isAuthenticated || !userId)) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, userId, isSessionReady]);

  // ✅ Sambil tunggu session siap (supabase.auth.getSession selesai)
  if (!isSessionReady) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <div className="text-lg font-semibold">Checking session...</div>
      </div>
    );
  }

  // ✅ Tampilkan modal auth jika belum login
  if (isSessionReady && (!isAuthenticated || !userId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
        <AuthRequiredModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  // ✅ Fetch vehicle jika tidak dikirim via state
  useEffect(() => {
    const fetchVehicle = async () => {
      if (!selectedVehicle && (params.vehicle_id || params.model_name)) {
        setIsLoading(true);
        try {
          let query = supabase.from("vehicles").select("*");

          if (params.vehicle_id) {
            query = query.eq("id", params.vehicle_id);
          } else if (params.model_name) {
            query = query.eq("model", params.model_name);
          }

          const { data, error } = await query.single();

          if (error) throw error;
          if (data) {
            setVehicle(data);
            console.log("Vehicle data fetched successfully:", data);
          } else {
            setError("Vehicle not found");
          }
        } catch (err) {
          console.error("Error fetching vehicle:", err);
          setError("Failed to load vehicle details");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchVehicle();
  }, [params.vehicle_id, params.model_name, selectedVehicle]);

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-6">Book a Car</h1>
        <div className="p-6 bg-white shadow-md rounded-md">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Book a Car</h1>
        <Card className="p-6 bg-white shadow-md">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ✅ Render Booking Form
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Book a Car</h1>
      <Card className="p-6 bg-white shadow-md">
        <BookingForm selectedVehicle={vehicle} />
      </Card>
    </div>
  );
}
