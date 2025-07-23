import React, { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Car, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface CarModelCardProps {
  modelName: string;
  availableCount: number;
  imageUrl?: string;
  onViewDetail?: () => void;
  vehicleData?: any; // Optional vehicle data to pass to booking
  modelId?: string; // Optional model ID for direct navigation
}

const CarModelCard: React.FC<CarModelCardProps> = ({
  modelName,
  availableCount,
  imageUrl = "/images/cover/default-car.jpg",
  onViewDetail,
  vehicleData,
  modelId,
}) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(data.session !== null);
    };

    checkAuth();
  }, []);

  const handleViewDetail = () => {
    // Use the onViewDetail prop if provided (this will handle auth check in parent)
    if (onViewDetail) {
      onViewDetail();
      return;
    }

    // Fallback: check authentication first
    if (!isAuthenticated) {
      // Show authentication modal instead of redirecting
      setShowAuthModal(true);
      return;
    }

    // Only proceed if user is authenticated
    if (vehicleData && availableCount > 0) {
      // If we have vehicle data, navigate to booking page with it
      if (vehicleData.id) {
        // If vehicle has an ID, use the new direct route
        navigate(`/booking/${vehicleData.id}`);
      } else {
        // Fallback to the old method if no ID
        navigate("/booking", { state: { selectedVehicle: vehicleData } });
      }
    } else if (modelId && availableCount > 0) {
      // If we have a model ID, navigate to the model details page
      navigate(`/models/${modelId}`, { state: { modelName } });
    } else if (modelName && availableCount > 0) {
      // If we only have a model name, use it for navigation
      // Normalize the model name by trimming extra spaces before encoding
      const normalizedModelName = modelName.trim();
      // Ensure proper encoding of spaces and special characters
      const encodedModelName = encodeURIComponent(normalizedModelName);
      navigate(`/models/${encodedModelName}`);
    }
  };

  // Make the entire card clickable for better UX
  const handleCardClick = () => {
    // Only allow click if car is available
    if (availableCount > 0) {
      handleViewDetail();
    }
  };

  return (
    <>
      <Card
        className="overflow-hidden transition-all duration-300 hover:shadow-lg border border-border/40 hover:border-primary/20 bg-card cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="aspect-video w-full overflow-hidden bg-muted relative group">
          <img
            src={imageUrl}
            alt={`${modelName} model`}
            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
            onError={(e) => {
              // Fallback to default image if the specified image fails to load
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80";
            }}
          />
          {availableCount > 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="default" className="bg-primary shadow-md">
                Available
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-5">
          <h3 className="text-xl font-semibold mb-3 text-foreground">
            {modelName}
          </h3>
          <div className="flex items-center">
            <Car className="h-4 w-4 mr-2 text-primary" />
            <span className="text-sm text-muted-foreground">
              {availableCount} unit{availableCount !== 1 ? "s" : ""} available
            </span>
          </div>
        </CardContent>
        <CardFooter className="p-5 pt-0">
          <Button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click event from firing
              handleViewDetail();
            }}
            className="w-full transition-all hover:bg-primary-dark"
            variant="default"
            disabled={availableCount === 0}
          >
            {availableCount > 0 ? "View Details" : "Not Available"}
          </Button>
        </CardFooter>
      </Card>

      {/* Authentication Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center mb-4">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-8 w-8 text-primary mr-2" />
            </div>
            <DialogTitle className="text-2xl font-bold text-primary">
              Authentication Required
            </DialogTitle>
            <DialogDescription className="text-lg text-muted-foreground">
              You need to Sign in or Register to continue
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CarModelCard;
