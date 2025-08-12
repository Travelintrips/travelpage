import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, PackageOpen, Luggage, Map as MapIcon } from "lucide-react";
import BookingForm from "./BookingFormBag";
import { useNavigate } from "react-router-dom";

interface BaggageSizeOption {
  id: string;
  size: string;
  price: number;
  icon: React.ReactNode;
  description: string;
}

interface BaggageSizeSelectorProps {
  onSelectSize: (size: string, price: number) => void;
  selectedSize?: string;
}

const BaggageSizeSelector = ({
  onSelectSize = () => {},
  selectedSize = "",
}: BaggageSizeSelectorProps) => {
  const [showForm, setShowForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [bookingData, setBookingData] = useState({
    size: "",
    price: 0,
    name: "",
    contact: "",
    email: "",
    phone: "",
    durationType: "hours",
    hours: 4,
    date: "",
    endDate: "",
  });

  const handleViewMap = () => {
    setShowMap(true);
  };

  const handleCloseMap = () => {
    setShowMap(false);
  };

  const handleSizeSelect = (size: string, price: number) => {
    console.log("[BaggageSizeSelector] handleSizeSelect:", size, price);
    console.log("[BaggageSizeSelector] Size type:", typeof size);
    console.log("[BaggageSizeSelector] Is electronic?", size === "electronic");
    setBookingData({ ...bookingData, size, price });
    setShowForm(true);
    onSelectSize(size, price);
  };

  const handleBookingComplete = (data) => {
    setBookingData({ ...bookingData, ...data });
    setShowReceipt(true);
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
  };
  const baggageOptions: BaggageSizeOption[] = [
    {
      id: "small",
      size: "Small",
      price: 75000,
      icon: <Package className="h-12 w-12" />,
      description: "Ideal for small bags, backpacks, or personal items",
    },
    {
      id: "medium",
      size: "Medium",
      price: 80000,
      icon: <PackageOpen className="h-12 w-12" />,
      description: "Perfect for carry-on luggage or medium-sized bags",
    },
    {
      id: "large",
      size: "Large",
      price: 90000,
      icon: <Luggage className="h-12 w-12" />,
      description: "Best for large suitcases or multiple items",
    },
    {
      id: "extra_large",
      size: "Extra Large",
      price: 100000,
      icon: <Package className="h-12 w-12" />,
      description: "Best for Extra large suitcases or multiple items",
    },
    {
      id: "electronic",
      size: "Electronic",
      price: 90000,
      icon: <Package className="h-12 w-12" />,
      description: "For electronic devices like laptops, cameras, keyboards",
    },
    {
      id: "surfingboard",
      size: "Surfing Board",
      price: 100000,
      icon: <Package className="h-12 w-12" />,
      description:
        "Best for Long or wide items such as surfboards or sporting gear.",
    },
    {
      id: "wheelchair",
      size: "Wheel Chair",
      price: 60000,
      icon: <Package className="h-12 w-12" />,
      description: "Best for Manual or foldable wheelchairs and mobility aids.",
    },
    {
      id: "stickgolf",
      size: "Stick Golf",
      price: 120000,
      icon: <Package className="h-12 w-12" />,
      description: "Best for Golf bags or long-shaped sports equipment.",
    },
  ];
  const navigate = useNavigate();

  return (
    <div className="w-full bg-white ">
      <div className="container-luggage mx-auto">
        {/*AirportBaggage*/}
        <div className="min-h-screen bg-slate-50">
          {/* Header */}
          <header className="w-full bg-sky-700 text-white py-6 shadow-md">
            <div className="flex items-center justify-between px-6">
              {/* Tombol Back di kiri */}
              <Button
                variant="outline"
                className="text-black border-white hover:bg-white-600 shadow-md font-semibold px-4 py-2 rounded-md"
                onClick={() => navigate("/")} // ganti '/' jika halaman front page berbeda
              >
                ← Back
              </Button>

              {/* Judul di tengah */}
              <h1 className="text-2xl md:text-3xl font-bold text-center flex-1">
                Airport Baggage Storage
              </h1>

              {/* Tombol View di kanan */}
              <Button
                variant="outline"
                className="text-blue-900 bg-white border-white hover:bg-blue-100 shadow-md font-semibold px-4 py-2 rounded-md"
                onClick={handleViewMap}
              >
                <MapIcon className="mr-2 h-4 w-4" /> View Storage Locations
              </Button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="w-full py-12 bg-gradient-to-b from-sky-600 to-sky-700 text-white">
            <div className="w-full px-6">
              <div className="max-w-6xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Store Your Baggage Safely
                </h2>
                <p className="text-xl max-w-2xl mx-auto">
                  Enjoy your layover without the burden of carrying your
                  luggage. Our secure storage service is available 24/7
                  throughout the airport.
                </p>
              </div>
            </div>
          </section>

          {/* Main Content Baggage */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <Card className="bg-white shadow-lg">
                <CardContent className="p-6">
                  {!showForm ? (
                    <div>
                      <h2 className="text-2xl font-bold text-center mb-8">
                        Select Your Baggage Size
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                        {baggageOptions.map((option) => (
                          <Card
                            key={option.id}
                            className={`cursor-pointer transition-all hover:shadow-lg ${bookingData.size === option.id ? "border-2 border-blue-500 shadow-md" : "border border-gray-200"}`}
                            onClick={() =>
                              handleSizeSelect(
                                validateBaggageSize(option.id),
                                option.price,
                              )
                            }
                          >
                            <CardContent className="flex flex-col items-center justify-center p-6">
                              <div
                                className={`p-4 rounded-full mb-4 ${bookingData.size === option.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                              >
                                {option.icon}
                              </div>
                              <h3 className="text-xl font-semibold mb-1">
                                {option.size}
                              </h3>
                              <p className="text-lg font-bold text-blue-600 mb-2">
                                Rp {option.price.toLocaleString("id-ID")}
                              </p>
                              <p className="text-gray-500 text-center text-sm mb-4">
                                {option.description}
                              </p>
                              <Button
                                variant={
                                  bookingData.size === option.id
                                    ? "default"
                                    : "outline"
                                }
                                className="w-full"
                                onClick={() =>
                                  handleSizeSelect(
                                    validateBaggageSize(option.id),
                                    option.price,
                                  )
                                }
                              >
                                {bookingData.size === option.id
                                  ? "Selected"
                                  : "Select"}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-2xl font-bold text-center mb-8">
                        Complete Your Booking
                      </h2>
                      <BookingForm
                        selectedSize={
                          bookingData.size as
                            | "small"
                            | "medium"
                            | "large"
                            | "extra_large"
                            | "electronic"
                            | "surfingboard"
                            | "wheelchair"
                            | "stickgolf"
                        }
                        onComplete={handleBookingComplete}
                        onCancel={() => setShowForm(false)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-12 bg-gray-100">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-center mb-8">
                Why Choose Our Service
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full bg-sky-100 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-sky-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      Secure Storage
                    </h3>
                    <p className="text-gray-600">
                      Your belongings are kept in a monitored, secure area with
                      24/7 surveillance.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full bg-sky-100 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-sky-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Quick & Easy</h3>
                    <p className="text-gray-600">
                      Drop off and pick up your baggage in minutes with our
                      efficient service.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full bg-sky-100 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-sky-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      Affordable Rates
                    </h3>
                    <p className="text-gray-600">
                      Competitive pricing with options for different baggage
                      sizes and durations.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-gray-800 text-white py-8">
            <div className="container mx-auto px-4 text-center">
              <p>
                © {new Date().getFullYear()} Airport Baggage Storage. All
                rights reserved.
              </p>
              <div className="mt-4">
                <a href="#" className="text-sky-300 hover:text-sky-100 mx-2">
                  Terms of Service
                </a>
                <a href="#" className="text-sky-300 hover:text-sky-100 mx-2">
                  Privacy Policy
                </a>
                <a href="#" className="text-sky-300 hover:text-sky-100 mx-2">
                  Contact Us
                </a>
              </div>
            </div>
          </footer>

          {/* Modals */}
          {showReceipt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md bg-white">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Booking Receipt</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCloseReceipt}
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Baggage Size</p>
                      <p className="font-medium">
                        {baggageOptions.find(
                          (opt) => opt.id === bookingData.size,
                        )?.size || ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{bookingData.name || ""}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="font-medium">{bookingData.contact || ""}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-medium">
                        Rp {bookingData.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Booking ID</p>
                      <p className="font-medium">
                        {Math.random()
                          .toString(36)
                          .substring(2, 10)
                          .toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Storage Location</p>
                      <p className="font-medium">{`Terminal ${Math.floor(Math.random() * 3) + 1}, Level ${Math.floor(Math.random() * 2) + 1}`}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleCloseReceipt}>
                      Close
                    </Button>
                    <Button onClick={handleViewMap}>View Map</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {showMap && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-4xl bg-white">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">
                      Airport Storage Locations
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleCloseMap}>
                      ✕
                    </Button>
                  </div>
                  <div className="bg-gray-200 h-96 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Airport Map View</p>
                      {bookingData.size && (
                        <p className="mt-2 font-medium text-blue-600">
                          Your baggage is stored at:{" "}
                          {`Terminal ${Math.floor(Math.random() * 3) + 1}, Level ${Math.floor(Math.random() * 2) + 1}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button onClick={handleCloseMap}>Close</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        {/* End of Airport Baggage Storage section */}
      </div>
    </div>
  );
};

export default BaggageSizeSelector;
