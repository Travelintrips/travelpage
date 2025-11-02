import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Hotel, UserRound, Car } from "lucide-react";
import FlightBookingForm from "@/components/booking/FlightBookingForm";
import HotelBookingForm from "@/components/booking/HotelBookingForm";
import PassengerHandlingForm from "@/components/booking/PassengerHandlingForm";
import CarRentalForm from "@/components/booking/CarRentalForm";
import ShoppingCart from "@/components/booking/ShoppingCart";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { useAuth } from "@/contexts/AuthContext";

const NewBookingPage = () => {
  const [activeTab, setActiveTab] = useState("flight");
  const { cartItems, totalAmount } = useShoppingCart();
  const { userRole } = useAuth();

  // Check if user role is allowed to create bookings
  const allowedRoles = ["Driver", "Admin", "Super Admin", "Staff"];
  
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
        <p className="mt-4">You don't have permission to create bookings.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Booking Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs
            defaultValue="flight"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="flight" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                <span className="hidden sm:inline">Flight</span>
              </TabsTrigger>
              <TabsTrigger value="hotel" className="flex items-center gap-2">
                <Hotel className="h-4 w-4" />
                <span className="hidden sm:inline">Hotel</span>
              </TabsTrigger>
              <TabsTrigger
                value="passenger"
                className="flex items-center gap-2"
              >
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">Passenger</span>
              </TabsTrigger>
              <TabsTrigger value="car" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                <span className="hidden sm:inline">Car Rental</span>
              </TabsTrigger>
            </TabsList>

            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "flight" && (
                    <div className="flex items-center gap-2">
                      <Plane className="h-5 w-5" />
                      <span>Penjualan Tiket Pesawat</span>
                    </div>
                  )}
                  {activeTab === "hotel" && (
                    <div className="flex items-center gap-2">
                      <Hotel className="h-5 w-5" />
                      <span>Penjualan Hotel</span>
                    </div>
                  )}
                  {activeTab === "passenger" && (
                    <div className="flex items-center gap-2">
                      <UserRound className="h-5 w-5" />
                      <span>Passenger Handling</span>
                    </div>
                  )}
                  {activeTab === "car" && (
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      <span>Rental Mobil</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabsContent value="flight">
                  <FlightBookingForm />
                </TabsContent>
                <TabsContent value="hotel">
                  <HotelBookingForm />
                </TabsContent>
                <TabsContent value="passenger">
                  <PassengerHandlingForm />
                </TabsContent>
                <TabsContent value="car">
                  <CarRentalForm />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>

        <div>
          <ShoppingCart />
        </div>
      </div>
    </div>
  );
};

export default NewBookingPage;