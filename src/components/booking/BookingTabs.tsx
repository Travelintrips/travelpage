import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BookingForm from "./BookingForm";
import PreRentalInspectionForm from "./PreRentalInspectionForm";
import PaymentForm from "../payment/PaymentForm";
import { Card, CardContent } from "@/components/ui/card";

interface BookingTabsProps {
  selectedVehicleId?: string;
}

const BookingTabs: React.FC<BookingTabsProps> = ({ selectedVehicleId }) => {
  const [activeTab, setActiveTab] = useState("select-vehicle");
  const [bookingData, setBookingData] = useState<any>(null);
  const [inspectionData, setInspectionData] = useState<any>(null);

  // Log state changes for debugging
  useEffect(() => {
    console.log("Active Tab:", activeTab);
    console.log("Booking Data:", bookingData);
    console.log("Inspection Data:", inspectionData);
  }, [activeTab, bookingData, inspectionData]);

  const handleBookingComplete = (data: any) => {
    console.log("Booking completed:", data);
    setBookingData(data);
    // Force the active tab to change
    setTimeout(() => {
      setActiveTab("inspection");
    }, 100);
  };

  const handleInspectionComplete = (data: any) => {
    console.log("Inspection completed:", data);
    setInspectionData(data);
    // Force the active tab to change
    setTimeout(() => {
      setActiveTab("payment");
    }, 100);
  };

  const handlePaymentComplete = (data: any) => {
    console.log("Payment completed:", data);
    // Navigate to confirmation or dashboard
    window.location.href = "/dashboard";
  };

  // Handle manual tab changes
  const handleTabChange = (value: string) => {
    // Only allow changing to tabs that should be enabled
    if (value === "inspection" && !bookingData) return;
    if (value === "payment" && (!bookingData || !inspectionData)) return;

    setActiveTab(value);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">
        Book Your Perfect Ride
      </h1>
      <p className="text-center text-muted-foreground mb-6">
        Select from our premium fleet of vehicles and customize your rental
        experience.
      </p>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="select-vehicle">Select Vehicle</TabsTrigger>
          <TabsTrigger
            value="inspection"
            disabled={!bookingData}
            className={bookingData ? "cursor-pointer" : "cursor-not-allowed"}
          >
            Inspection
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            disabled={!bookingData || !inspectionData}
            className={
              bookingData && inspectionData
                ? "cursor-pointer"
                : "cursor-not-allowed"
            }
          >
            Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="select-vehicle">
          <Card>
            <CardContent className="pt-6">
              <BookingForm
                selectedVehicle={
                  selectedVehicleId ? { id: selectedVehicleId } : undefined
                }
                onBookingComplete={handleBookingComplete}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspection">
          <Card>
            <CardContent className="pt-6">
              {bookingData ? (
                <PreRentalInspectionForm
                  vehicleId={bookingData.vehicleId}
                  bookingId={bookingData.bookingId}
                  onComplete={handleInspectionComplete}
                />
              ) : (
                <div className="text-center py-8">
                  <p>Please complete the booking details first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardContent className="pt-6">
              {bookingData ? (
                <PaymentForm
                  bookingId={bookingData.bookingId}
                  totalAmount={bookingData.totalAmount}
                  onPaymentComplete={handlePaymentComplete}
                />
              ) : (
                <div className="text-center py-8">
                  <p>Please complete the booking details first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BookingTabs;
