import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Check, Car, UserCheck, AlertTriangle, ArrowRight } from "lucide-react";
import PostRentalInspectionForm from "./PostRentalInspectionForm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

interface PickupCustomerProps {
  bookingId: string;
  vehicleId: string;
  customerName?: string;
  vehicleDetails?: any;
  driverOption?: string;
  onComplete?: (data: any) => void;
  onCancel?: () => void;
}

const PickupCustomer: React.FC<PickupCustomerProps> = ({
  bookingId,
  vehicleId,
  customerName = "Customer",
  vehicleDetails = null,
  driverOption,
  onComplete,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmChecklist, setConfirmChecklist] = useState({
    identityVerified: false,
    paymentConfirmed: false,
    documentsProvided: false,
    keysHandedOver: false,
  });
  const [showPostRentalInspection, setShowPostRentalInspection] =
    useState(false);
  const [preInspectionData, setPreInspectionData] = useState<any>(null);
  const [isReturning, setIsReturning] = useState(false);

  const allChecked = Object.values(confirmChecklist).every(Boolean);

  const handleChecklistChange = (field: string) => {
    setConfirmChecklist((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev],
    }));
  };

  // New function to handle the "Check All" checkbox
  const handleCheckAll = (checked: boolean) => {
    setConfirmChecklist({
      identityVerified: checked,
      paymentConfirmed: checked,
      documentsProvided: checked,
      keysHandedOver: checked,
    });
  };

  const handleConfirmPickup = async () => {
    if (!allChecked) {
      alert("Please complete all checklist items before confirming pickup");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update booking status to "onride"
      const { error } = await supabase
        .from("bookings")
        .update({ status: "onride" })
        .eq("id", bookingId);

      if (error) throw error;

      // Fetch pre-rental inspection data for comparison in post-rental inspection
      const { data: inspectionData, error: inspectionError } = await supabase
        .from("inspections")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("inspection_type", "pre-rental")
        .single();

      if (inspectionError && inspectionError.code !== "PGRST116") {
        // PGRST116 is the error code for no rows returned
        console.error("Error fetching pre-rental inspection:", inspectionError);
      }

      setPreInspectionData(inspectionData || null);

      // Call the onComplete callback with the updated booking data
      if (onComplete) {
        onComplete({
          bookingId,
          vehicleId,
          status: "onride",
          pickupConfirmed: true,
          pickupTime: new Date().toISOString(),
          showPreInspection: true, // Add flag to indicate pre-inspection should be shown
          driverOption: driverOption, // Pass the driver option to the parent component
        });
      }

      // Show success message
      toast({
        title: "Pickup confirmed",
        description:
          "The vehicle has been successfully handed over to the customer.",
        variant: "default",
      });

      // Don't show post-rental inspection yet, wait for return
    } catch (error) {
      console.error("Error confirming pickup:", error);
      alert(`There was an error confirming the pickup: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle vehicle return
  const handleVehicleReturn = async () => {
    setIsReturning(true);
    try {
      // Fetch pre-rental inspection data for comparison in post-rental inspection
      const { data: inspectionData, error: inspectionError } = await supabase
        .from("inspections")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("inspection_type", "pre-rental")
        .single();

      if (inspectionError && inspectionError.code !== "PGRST116") {
        console.error("Error fetching pre-rental inspection:", inspectionError);
      }

      setPreInspectionData(inspectionData || null);
      setShowPostRentalInspection(true);
    } catch (error) {
      console.error("Error preparing for vehicle return:", error);
      toast({
        title: "Error",
        description: `There was an error preparing for vehicle return: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsReturning(false);
    }
  };

  // If showing post-rental inspection, render that component instead
  if (showPostRentalInspection) {
    return (
      <PostRentalInspectionForm
        vehicleId={vehicleId}
        bookingId={bookingId}
        preInspectionData={preInspectionData}
        onComplete={(data) => {
          // Handle completion of post-rental inspection
          if (onComplete) {
            onComplete({
              ...data,
              status: "finished",
              bookingId,
              vehicleId,
            });
          }
        }}
        onCancel={() => {
          // Go back to pickup form
          setShowPostRentalInspection(false);
        }}
      />
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md">
      <CardHeader className="bg-primary-tosca/10">
        <CardTitle className="text-2xl font-bold flex items-center">
          <Car className="mr-2 h-6 w-6" />
          Customer Pickup
        </CardTitle>
        <CardDescription>
          Confirm the customer pickup for booking #{bookingId}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Booking Details</h3>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-sm">Booking ID:</p>
              <p className="text-sm font-medium">#{bookingId}</p>
              <p className="text-sm">Customer:</p>
              <p className="text-sm font-medium">{customerName}</p>
              {vehicleDetails && (
                <>
                  <p className="text-sm">Vehicle:</p>
                  <p className="text-sm font-medium">
                    {vehicleDetails.make} {vehicleDetails.model}{" "}
                    {vehicleDetails.year && `(${vehicleDetails.year})`}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Pickup Checklist</h3>
            {/* Add Check All checkbox */}
            <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-100">
              <Checkbox
                id="check-all"
                checked={allChecked}
                onCheckedChange={(checked) => handleCheckAll(!!checked)}
              />
              <Label htmlFor="check-all" className="text-sm font-medium">
                Check All
              </Label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="identity"
                  checked={confirmChecklist.identityVerified}
                  onCheckedChange={() =>
                    handleChecklistChange("identityVerified")
                  }
                />
                <Label htmlFor="identity" className="text-sm">
                  Customer identity verified
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="payment"
                  checked={confirmChecklist.paymentConfirmed}
                  onCheckedChange={() =>
                    handleChecklistChange("paymentConfirmed")
                  }
                />
                <Label htmlFor="payment" className="text-sm">
                  Payment confirmed
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="documents"
                  checked={confirmChecklist.documentsProvided}
                  onCheckedChange={() =>
                    handleChecklistChange("documentsProvided")
                  }
                />
                <Label htmlFor="documents" className="text-sm">
                  Required documents provided
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="keys"
                  checked={confirmChecklist.keysHandedOver}
                  onCheckedChange={() =>
                    handleChecklistChange("keysHandedOver")
                  }
                />
                <Label htmlFor="keys" className="text-sm">
                  Vehicle keys handed over
                </Label>
              </div>
            </div>
          </div>

          {!allChecked && (
            <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p className="text-sm">
                Please complete all checklist items before confirming pickup
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}

        {confirmChecklist.keysHandedOver ? (
          <div className="flex gap-2 ml-auto">
            <Button
              onClick={handleVehicleReturn}
              variant="secondary"
              disabled={isReturning}
            >
              {isReturning ? "Processing..." : "Process Return"}
              {!isReturning && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
            <Button
              onClick={handleConfirmPickup}
              className="bg-primary-tosca hover:bg-primary-tosca/90"
              disabled={!allChecked || isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm Pickup"}
              {!isSubmitting && <UserCheck className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConfirmPickup}
            className="ml-auto bg-primary-tosca hover:bg-primary-tosca/90"
            disabled={!allChecked || isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Confirm Pickup"}
            {!isSubmitting && <UserCheck className="ml-2 h-4 w-4" />}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PickupCustomer;
