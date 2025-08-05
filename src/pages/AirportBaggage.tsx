import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Boxes } from "lucide-react";
import { Laptop, MonitorSmartphone, TabletSmartphone } from "lucide-react";
import { Waves, Tent, Compass } from "lucide-react";
import { WheelchairIcon } from "@/components/icons";
import { SurfingIcon, GolfIcon, JoinedIcon } from "@/components/icons";
import { format } from "date-fns";
import {
  Package,
  PackageOpen,
  Luggage,
  Map as MapIcon,
  Loader2,
} from "lucide-react";
import BookingForm from "./BookingFormBag";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { useAuth } from "@/contexts/AuthContext";
import ShoppingCart from "@/components/booking/ShoppingCart";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";

interface BaggageSizeOption {
  id: string;
  size: string;
  price: number;
  icon: React.ReactNode;
  description: string;
}

interface AirportBaggageProps {
  onSelectSize?: (size: string, price: number) => void;
  selectedSize?: string;
}

// Default prices to use as fallback - updated to match database values
const DEFAULT_PRICES = {
  small_price: 70000,
  medium_price: 80000,
  large_price: 90000,
  extra_large_price: 100000,
  electronic_price: 90000,
  surfingboard_price: 100000,
  wheelchair_price: 110000,
  stickgolf_price: 110000,
};

const AirportBaggage = ({
  onSelectSize = () => {},
  selectedSize = "",
}: AirportBaggageProps) => {
  // All hooks must be declared at the top level and in the same order every time
  const { toast } = useToast();
  const { addToCart } = useShoppingCart();
  const {
    userId,
    isLoading: authLoading,
    isAuthenticated,
    userName,
    userEmail,
    isHydrated,
  } = useAuth();
  const navigate = useNavigate();

  // All state hooks declared first
  const [userPhone, setUserPhone] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
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
    startTime: "",
    duration: 0,
    startDate: "",
    storageLocation: "",
  });
  const [baggagePrices, setBaggagePrices] =
    useState<Record<string, number>>(DEFAULT_PRICES);
  const [persistentStorageLocation, setPersistentStorageLocation] =
    useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Memoized functions to prevent unnecessary re-renders
  const loadPricesFromLocalStorage = useCallback((): Record<
    string,
    number
  > | null => {
    try {
      const savedPrices = localStorage.getItem("baggage_prices");
      if (savedPrices) {
        const parsedPrices = JSON.parse(savedPrices);
        console.log(
          "📂 Loaded baggage prices from localStorage:",
          parsedPrices,
        );
        return parsedPrices;
      }
    } catch (error) {
      console.error(
        "❌ Error loading baggage prices from localStorage:",
        error,
      );
    }
    return null;
  }, []);

  const savePricesToLocalStorage = useCallback(
    (prices: Record<string, number>) => {
      try {
        localStorage.setItem("baggage_prices", JSON.stringify(prices));
        console.log("💾 Baggage prices saved to localStorage");
      } catch (error) {
        console.error("❌ Error saving baggage prices to localStorage:", error);
      }
    },
    [],
  );

  const getCurrentUserName = useCallback(() => {
    if (userName && userName.trim() !== "") {
      return userName;
    }
    const storedUserName = localStorage.getItem("userName");
    if (storedUserName && storedUserName.trim() !== "") {
      return storedUserName;
    }
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData?.name && userData.name.trim() !== "") {
          return userData.name;
        }
      } catch (error) {
        console.warn("[AirportBaggage] Error parsing auth_user:", error);
      }
    }
    if (userEmail && userEmail.includes("@")) {
      return userEmail.split("@")[0];
    }
    return "";
  }, [userName, userEmail]);

  const getCurrentUserEmail = useCallback(() => {
    if (userEmail && userEmail.trim() !== "") {
      return userEmail;
    }
    const storedUserEmail = localStorage.getItem("userEmail");
    if (storedUserEmail && storedUserEmail.trim() !== "") {
      return storedUserEmail;
    }
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData?.email && userData.email.trim() !== "") {
          return userData.email;
        }
      } catch (error) {
        console.warn("[AirportBaggage] Error parsing auth_user:", error);
      }
    }
    return "";
  }, [userEmail]);

  const getOrCreateStorageLocation = useCallback(() => {
    if (persistentStorageLocation) {
      return persistentStorageLocation;
    }
    const storedLocation = localStorage.getItem("baggage_storage_location");
    if (storedLocation) {
      setPersistentStorageLocation(storedLocation);
      return storedLocation;
    }
    const terminals = [1, 2, 3];
    const levels = [1, 2];
    const randomTerminal =
      terminals[Math.floor(Math.random() * terminals.length)];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    const newLocation = `Terminal ${randomTerminal}, Level ${randomLevel}`;
    setPersistentStorageLocation(newLocation);
    localStorage.setItem("baggage_storage_location", newLocation);
    return newLocation;
  }, [persistentStorageLocation]);

  // Event handlers
  const handleViewMap = useCallback(() => {
    setShowMap(true);
  }, []);

  const handleCloseMap = useCallback(() => {
    setShowMap(false);
  }, []);

  const handleSizeSelect = useCallback(
    (size: string, price: number) => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hours}:${minutes}`;
      const storageLocation = getOrCreateStorageLocation();

      setBookingData((prev) => ({
        ...prev,
        size,
        price,
        date: new Date().toISOString().split("T")[0],
        startTime: currentTime,
        storageLocation,
      }));
      setShowForm(true);
      onSelectSize(size, price);
    },
    [getOrCreateStorageLocation, onSelectSize],
  );

  const handleBookingComplete = useCallback(
    async (data) => {
      console.log("📋 Booking completed with data:", data);

      // Define baggage options locally to avoid initialization issues
      const localBaggageOptions = [
        { id: "baggage-small", size: "Small" },
        { id: "baggage-medium", size: "Medium" },
        { id: "baggage-large", size: "Large" },
        { id: "baggage-extra-large", size: "Extra Large" },
        { id: "baggage-electronics", size: "Electronics" },
        { id: "baggage-surfing-board", size: "Surfing Board" },
        { id: "baggage-wheelchair", size: "Wheel Chair" },
        { id: "baggage-stick-golf", size: "Stick Golf" },
      ];

      // Find the selected baggage option to get the size name
      const selectedOption = localBaggageOptions.find(
        (option) => option.id === bookingData.size,
      );
      const baggageSizeName = selectedOption
        ? selectedOption.size.toLowerCase().replace(" ", "_")
        : "medium";

      // 🎯 REMOVED: Cart addition is now handled by BookingFormBag.tsx to prevent duplicates
      // The BookingFormBag component will handle adding items to cart with proper validation
      console.log(
        "[AirportBaggage] Cart addition will be handled by BookingFormBag component",
      );

      setBookingData((prev) => ({
        ...prev,
        ...data,
        is_guest: !isAuthenticated || !userId,
        bookingCode: data.bookingCode,
        storageLocation:
          data.storageLocation ||
          persistentStorageLocation ||
          getOrCreateStorageLocation(),
      }));
      // 🎯 REMOVED: No longer showing receipt modal - user will be redirected to cart
      // setShowReceipt(true);
    },
    [
      isAuthenticated,
      userId,
      persistentStorageLocation,
      getOrCreateStorageLocation,
      bookingData.size,
      bookingData.price,
      addToCart,
      toast,
    ],
  );

  const handleCloseReceipt = useCallback(() => {
    setShowReceipt(false);
  }, []);

  const handleViewCart = useCallback(() => {
    setShowCart(true);
  }, []);

  const handleCloseCart = useCallback(() => {
    setShowCart(false);
  }, []);

  // Fetch baggage prices from database
  const fetchBaggagePrices = useCallback(async () => {
    try {
      console.log("🔄 Fetching baggage prices from database...");
      const { data, error } = await supabase
        .from("baggage_price")
        .select("*")
        .limit(1);

      if (error) {
        console.error("❌ Error fetching baggage prices:", error);
        toast({
          title: "Error",
          description: "Failed to fetch baggage prices. Using default prices.",
          variant: "destructive",
        });
        return;
      }

      if (data && data.length > 0) {
        const priceData = data[0];
        const parsedPrices = {
          small_price:
            parseFloat(priceData.small_price) || DEFAULT_PRICES.small_price,
          medium_price:
            parseFloat(priceData.medium_price) || DEFAULT_PRICES.medium_price,
          large_price:
            parseFloat(priceData.large_price) || DEFAULT_PRICES.large_price,
          extra_large_price:
            parseFloat(priceData.extra_large_price) ||
            DEFAULT_PRICES.extra_large_price,
          electronic_price:
            parseFloat(priceData.electronic_price) ||
            DEFAULT_PRICES.electronic_price,
          surfingboard_price:
            parseFloat(priceData.surfingboard_price) ||
            DEFAULT_PRICES.surfingboard_price,
          wheelchair_price:
            parseFloat(priceData.wheelchair_price) ||
            DEFAULT_PRICES.wheelchair_price,
          stickgolf_price:
            parseFloat(priceData.stickgolf_price) ||
            DEFAULT_PRICES.stickgolf_price,
        };

        console.log("💰 Database price data received:", priceData);
        console.log("💰 Final validated baggage prices:", parsedPrices);

        console.log("💰 Final validated baggage prices:", parsedPrices);
        setBaggagePrices(parsedPrices);
        savePricesToLocalStorage(parsedPrices);
      }
    } catch (error) {
      console.error("🚨 Exception in fetchBaggagePrices:", error);
      toast({
        title: "Database Error",
        description: "Could not connect to database. Using default prices.",
        variant: "destructive",
      });
    }
  }, [toast, savePricesToLocalStorage]);

  // Initialize component - single effect for initialization
  useEffect(() => {
    if (!isHydrated || isInitialized) return;

    console.log("[AirportBaggage] Initializing component");

    // Initialize storage location
    const storedLocation = localStorage.getItem("baggage_storage_location");
    if (storedLocation) {
      setPersistentStorageLocation(storedLocation);
    }

    // Load cached prices first
    const cachedPrices = loadPricesFromLocalStorage();
    if (cachedPrices && Object.keys(cachedPrices).length > 0) {
      setBaggagePrices(cachedPrices);
    }

    // Fetch fresh prices from database
    fetchBaggagePrices();

    setLoading(false);
    setIsInitialized(true);
  }, [
    isHydrated,
    isInitialized,
    loadPricesFromLocalStorage,
    fetchBaggagePrices,
  ]);

  // Handle auth state changes
  useEffect(() => {
    if (isAuthenticated && userId && !authLoading) {
      const storedPhone = localStorage.getItem("userPhone");
      if (storedPhone) {
        setUserPhone(storedPhone);
      }

      const currentUserName = getCurrentUserName();
      const currentUserEmail = getCurrentUserEmail();

      if (currentUserName) {
        localStorage.setItem("userName", currentUserName);
      }
      if (currentUserEmail) {
        localStorage.setItem("userEmail", currentUserEmail);
      }
    } else if (!isAuthenticated && !authLoading) {
      setUserPhone("");
      localStorage.removeItem("userPhone");
    }
  }, [
    isAuthenticated,
    userId,
    authLoading,
    getCurrentUserName,
    getCurrentUserEmail,
  ]);

  // Memoized baggage options to prevent unnecessary re-renders
  const baggageOptions: BaggageSizeOption[] = useMemo(
    () => [
      {
        id: "baggage-small",
        size: "Small",
        price: baggagePrices.small_price || 0,
        icon: <Package className="h-12 w-12" />,
        description: "Ideal for small bags, backpacks, or personal items",
      },
      {
        id: "baggage-medium",
        size: "Medium",
        price: baggagePrices.medium_price || 0,
        icon: <PackageOpen className="h-12 w-12" />,
        description: "Perfect for carry-on luggage or medium-sized bags",
      },
      {
        id: "baggage-large",
        size: "Large",
        price: baggagePrices.large_price || 0,
        icon: <Luggage className="h-12 w-12" />,
        description: "Best for large suitcases or multiple items",
      },
      {
        id: "baggage-extra-large",
        size: "Extra Large",
        price: baggagePrices.extra_large_price || 0,
        icon: <Boxes className="h-12 w-12" />,
        description: "Best for Extra large suitcases or multiple items",
      },
      {
        id: "baggage-electronics",
        size: "Electronics",
        price: baggagePrices.electronic_price || 0,
        icon: <JoinedIcon className="h-12 w-12" />,
        description: "Best for Goods Electronic Laptop,Keyboards,Guitar,Camera",
      },
      {
        id: "baggage-surfing-board",
        size: "Surfing Board",
        price: baggagePrices.surfingboard_price || 0,
        icon: <SurfingIcon className="h-12 w-12" />,
        description:
          "Best for Long or wide items such as surfboards or sporting gear.",
      },
      {
        id: "baggage-wheelchair",
        size: "Wheel Chair",
        price: baggagePrices.wheelchair_price || 0,
        icon: <WheelchairIcon />,
        description:
          "Best for Manual or foldable wheelchairs and mobility aids.",
      },
      {
        id: "baggage-stick-golf",
        size: "Stick Golf",
        price: baggagePrices.stickgolf_price || 0,
        icon: <GolfIcon className="h-12 w-12" />,
        description: "Best for Golf bags or long-shaped sports equipment.",
      },
    ],
    [baggagePrices],
  );

  const formatPrice = useCallback(
    (price: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(price),
    [],
  );

  // Show loading state only during initialization, not session checks
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Initializing baggage service...
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Please wait while we prepare the booking system
          </p>
        </div>
      </div>
    );
  }

  // Show loading state only when actually loading prices
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading baggage prices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      <div className="container-luggage mx-auto max-w-full bg-white">
        <div className="min-h-screen bg-slate-50">
          {/* Header */}
          <header className="w-full bg-sky-700 text-white py-6 shadow-md">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-0 sm:justify-between px-4 sm:px-6">
              <Button
                variant="outline"
                className="text-black border-white hover:bg-white-600 shadow-md font-semibold px-4 py-2 rounded-md w-full sm:w-auto"
                onClick={() => navigate("/")}
              >
                ← Back
              </Button>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center w-full sm:flex-1 order-first sm:order-none">
                Airport Baggage Storage
              </h1>
              <Button
                variant="outline"
                className="text-blue-900 bg-white border-white hover:bg-blue-100 shadow-md font-semibold px-4 py-2 rounded-md w-full sm:w-auto"
                onClick={handleViewMap}
              >
                <MapIcon className="mr-2 h-4 w-4" /> View Storage Locations
              </Button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="w-full py-8 sm:py-12 bg-gradient-to-b from-sky-600 to-sky-700 text-white">
            <div className="w-full px-4 sm:px-6">
              <div className="max-w-6xl mx-auto text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words">
                  Store Your Baggage Safely
                </h2>
                <p className="text-base sm:text-xl max-w-2xl mx-auto">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
                        {baggageOptions.map((option) => (
                          <Card
                            key={option.id}
                            className={`cursor-pointer transition-all hover:shadow-lg ${
                              bookingData.size === option.id
                                ? "border-2 border-blue-500 shadow-md"
                                : "border border-gray-200"
                            }`}
                            onClick={() =>
                              handleSizeSelect(option.id, option.price)
                            }
                          >
                            <CardContent className="flex flex-col items-center justify-center p-6">
                              <div
                                className={`p-4 rounded-full mb-4 ${
                                  bookingData.size === option.id
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {option.icon}
                              </div>
                              <h3 className="text-xl font-semibold mb-1">
                                {option.size}
                              </h3>
                              <p className="text-lg font-bold text-blue-600 mb-2">
                                {formatPrice(option.price)}
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
                                  handleSizeSelect(option.id, option.price)
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
                        selectedSize={(() => {
                          // Convert baggage option ID to the expected format
                          const sizeMap: Record<
                            string,
                            | "small"
                            | "medium"
                            | "large"
                            | "extra_large"
                            | "electronic"
                            | "surfingboard"
                            | "wheelchair"
                            | "stickgolf"
                          > = {
                            "baggage-small": "small",
                            "baggage-medium": "medium",
                            "baggage-large": "large",
                            "baggage-extra-large": "extra_large",
                            "baggage-electronics": "electronic",
                            "baggage-surfing-board": "surfingboard",
                            "baggage-wheelchair": "wheelchair",
                            "baggage-stick-golf": "stickgolf",
                          };
                          return (
                            sizeMap[bookingData.size as keyof typeof sizeMap] ||
                            "small"
                          );
                        })()}
                        baggagePrices={{
                          small:
                            baggagePrices.small_price ||
                            DEFAULT_PRICES.small_price,
                          medium:
                            baggagePrices.medium_price ||
                            DEFAULT_PRICES.medium_price,
                          large:
                            baggagePrices.large_price ||
                            DEFAULT_PRICES.large_price,
                          extra_large:
                            baggagePrices.extra_large_price ||
                            DEFAULT_PRICES.extra_large_price,
                          electronic:
                            baggagePrices.electronic_price ||
                            DEFAULT_PRICES.electronic_price,
                          surfingboard:
                            baggagePrices.surfingboard_price ||
                            DEFAULT_PRICES.surfingboard_price,
                          wheelchair:
                            baggagePrices.wheelchair_price ||
                            DEFAULT_PRICES.wheelchair_price,
                          stickgolf:
                            baggagePrices.stickgolf_price ||
                            DEFAULT_PRICES.stickgolf_price,
                        }}
                        onComplete={handleBookingComplete}
                        onCancel={() => setShowForm(false)}
                        initialDate={new Date()}
                        initialTime={bookingData.startTime || ""}
                        prefilledData={
                          isAuthenticated
                            ? {
                                name: getCurrentUserName(),
                                email: getCurrentUserEmail(),
                                phone:
                                  userPhone ||
                                  localStorage.getItem("userPhone") ||
                                  "",
                              }
                            : undefined
                        }
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
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
                        {(() => {
                          const localBaggageOptions = [
                            {
                              id: "baggage-small",
                              size: "Small",
                            },
                            {
                              id: "baggage-medium",
                              size: "Medium",
                            },
                            {
                              id: "baggage-large",
                              size: "Large",
                            },
                            {
                              id: "baggage-extra-large",
                              size: "Extra Large",
                            },
                            {
                              id: "baggage-electronics",
                              size: "Electronics",
                            },
                            {
                              id: "baggage-surfing-board",
                              size: "Surfing Board",
                            },
                            {
                              id: "baggage-wheelchair",
                              size: "Wheel Chair",
                            },
                            {
                              id: "baggage-stick-golf",
                              size: "Stick Golf",
                            },
                          ];
                          return (
                            localBaggageOptions.find(
                              (opt) => opt.id === bookingData.size,
                            )?.size || ""
                          );
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{bookingData.name || ""}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{bookingData.email || ""}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{bookingData.phone || ""}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-medium">
                        Rp {bookingData.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium">
                        {bookingData.hours
                          ? `${bookingData.hours} ${bookingData.durationType === "days" ? "day(s)" : "hour(s)"}`
                          : ""}
                      </p>
                    </div>
                    {bookingData.durationType === "hours" && (
                      <div>
                        <p className="text-sm text-gray-500">Start Date</p>
                        <p className="font-medium">
                          {format(
                            new Date(bookingData.date || new Date()),
                            "MMMM d, yyyy - HH:mm",
                          )}
                        </p>
                      </div>
                    )}
                    {bookingData.durationType === "days" && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Start Date</p>
                          <p className="font-medium">
                            {format(
                              new Date(bookingData.startDate),
                              "MMMM d, yyyy - HH:mm",
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">End Date</p>
                          <p className="font-medium">
                            {format(
                              new Date(bookingData.endDate),
                              "MMMM d, yyyy",
                            )}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Booking ID</p>
                      <p className="font-medium font-mono text-blue-600">
                        {(bookingData as any).bookingCode || "GENERATING..."}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Storage Location</p>
                      <p className="font-medium">
                        {bookingData.storageLocation ||
                          persistentStorageLocation ||
                          getOrCreateStorageLocation()}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <div className="text-center">
                        <p className="font-medium">Travelin Baggage</p>
                        <p className="text-sm text-gray-500">
                          Thank you for your order
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleCloseReceipt}>
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          handleCloseReceipt();
                          navigate("/cart");
                        }}
                      >
                        View Cart
                      </Button>
                    </div>
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
                          {bookingData.storageLocation ||
                            persistentStorageLocation ||
                            getOrCreateStorageLocation()}
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

          {showCart && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-6xl max-h-[90vh] overflow-auto">
                <ShoppingCart />
                <div className="flex justify-end p-4">
                  <Button onClick={handleCloseCart}>Close Cart</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AirportBaggage;
