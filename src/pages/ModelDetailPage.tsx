import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, User, CreditCard, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";

interface Vehicle {
  id: string;
  name: string;
  type: "sedan" | "suv" | "truck" | "luxury";
  price: number;
  image: string;
  seats: number;
  transmission: "automatic" | "manual";
  fuelType: "petrol" | "diesel" | "electric" | "hybrid";
  available: boolean;
  features: string[];
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  vehicle_type_id?: number;
  vehicle_type_name?: string;
}

const ModelDetailPage = () => {
  const { modelName } = useParams<{ modelName: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, userId } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!modelName) return;

      setIsLoading(true);
      try {
        const decodedModelName = decodeURIComponent(modelName);
        console.log("Fetching vehicles for model:", decodedModelName);

        // Split the model name to get make and model separately
        const parts = decodedModelName.split(" ");
        let make = "";
        let model = "";

        if (parts.length >= 2) {
          make = parts[0];
          model = parts.slice(1).join(" ");
        } else {
          // If only one word, use it as both make and model for broader search
          make = decodedModelName;
          model = decodedModelName;
        }

        // Query vehicles with flexible matching
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .or(`make.ilike.%${make}%,model.ilike.%${model}%`);

        if (error) {
          console.error("Error fetching vehicles:", error);
          setError("Failed to load vehicles");
          return;
        }

        if (!data || data.length === 0) {
          setError(`No vehicles found for ${decodedModelName}`);
          setVehicles([]);
          return;
        }

        // Transform vehicle data
        const transformedVehicles = data.map((vehicle) => ({
          id: vehicle.id.toString(),
          name:
            `${vehicle.make || ""} ${vehicle.model || ""}`.trim() ||
            "Unknown Vehicle",
          type: vehicle.type || "sedan",
          price: vehicle.price || 0,
          image:
            vehicle.image ||
            "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
          seats: vehicle.seats || 4,
          transmission: vehicle.transmission || "automatic",
          fuelType: vehicle.fuel_type || "petrol",
          available: vehicle.available !== false,
          features: vehicle.features
            ? typeof vehicle.features === "string"
              ? JSON.parse(vehicle.features)
              : Array.isArray(vehicle.features)
                ? vehicle.features
                : ["AC"]
            : ["AC"],
          vehicle_type_id: vehicle.vehicle_type_id,
          vehicle_type_name: vehicle.vehicle_type_name,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          license_plate: vehicle.license_plate,
        }));

        setVehicles(transformedVehicles);
      } catch (err) {
        console.error("Error processing vehicles data:", err);
        setError("An error occurred while loading vehicles");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicles();
  }, [modelName]);

  const handleBookVehicle = (vehicle: Vehicle) => {
    if (!isAuthenticated) {
      navigate("/", {
        state: {
          requireAuth: true,
          returnPath: `/booking`,
          returnState: { selectedVehicle: vehicle },
        },
      });
      return;
    }

    if (vehicle.id) {
      navigate(`/booking/${vehicle.id}`);
    } else {
      navigate("/booking", { state: { selectedVehicle: vehicle } });
    }
  };

  if (!isAuthenticated || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
        <AuthRequiredModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {modelName && decodeURIComponent(modelName)}
          </h1>
          <p className="text-muted-foreground">
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}{" "}
            available
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/rentcar")}>
          Back to Models
        </Button>
      </div>

      {error ? (
        <div className="text-center py-12">
          <Car className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
          <h3 className="text-xl font-medium mt-4">{error}</h3>
          <p className="text-muted-foreground mt-2">
            Try searching for a different model
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <Card
              key={vehicle.id}
              className="overflow-hidden transition-all hover:shadow-md"
            >
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={vehicle.image}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="h-full w-full object-cover transition-all hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80";
                  }}
                />
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">
                    {vehicle.make} {vehicle.model} {vehicle.year}
                  </h3>
                  {vehicle.available ? (
                    <Badge className="bg-green-500">Available</Badge>
                  ) : (
                    <Badge variant="outline">Not Available</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{vehicle.seats} Seats</span>
                  </div>
                  <div className="flex items-center">
                    <Car className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{vehicle.transmission}</span>
                  </div>
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(vehicle.price)}
                      /day
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{vehicle.fuelType}</span>
                  </div>
                </div>

                {vehicle.license_plate && (
                  <div className="text-sm text-muted-foreground mb-4">
                    License Plate: {vehicle.license_plate}
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!vehicle.available}
                  onClick={() => handleBookVehicle(vehicle)}
                >
                  {vehicle.available ? "Book Now" : "Not Available"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelDetailPage;
