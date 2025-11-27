import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Car,
  Calendar,
  CreditCard,
  User,
  Globe,
  Plane,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import AuthForm from "./auth/AuthForm";
import VehicleSelector from "./booking/VehicleSelector";
import BookingForm from "./booking/BookingForm";
import PreRentalInspectionForm from "./booking/PreRentalInspectionForm";
import CarModelCard from "./CarModelCard";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Badge } from "./ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useVehicleData, Vehicle } from "@/hooks/useVehicleData";
import { useForceLogoutRedirect } from "@/hooks/useForceLogoutRedirect";
import AuthRequiredModal from "./auth/AuthRequiredModal";

const RentCar = () => {
  const navigate = useNavigate();
  const { modelName } = useParams<{ modelName: string }>();
  const { t, i18n } = useTranslation();
  // Safely get auth context with error handling
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.warn("Failed to get auth context in RentCar:", error);
    authContext = {
      userRole: null,
      userEmail: null,
      userName: null,
      signOut: async () => {
        console.warn("signOut called from fallback auth context");
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.warn("Error in fallback signOut:", signOutError);
        }
      },
      isAuthenticated: false,
      userId: null,
      isSessionReady: true,
      userPhone: null,
      isAdmin: false,
      isLoading: false,
      isHydrated: true,
      isCheckingSession: false,
      forceRefreshSession: async () => {
        console.warn("forceRefreshSession called from fallback auth context");
        try {
          await supabase.auth.refreshSession();
        } catch (refreshError) {
          console.warn("Error in fallback refresh:", refreshError);
        }
      },
      ensureSessionReady: async () => {
        console.warn("ensureSessionReady called from fallback auth context");
        return Promise.resolve();
      },
    };
  }

  const {
    userRole,
    userEmail,
    userName,
    signOut,
    isAuthenticated,
    userId,
    isSessionReady,
  } = authContext;

  // Add force logout redirect hook
  const { isLoading } = useForceLogoutRedirect(false);

  // Use the custom hook for vehicle data
  const {
    carModels,
    isLoadingModels,
    selectedModel,
    setSelectedModel,
    error: vehicleError,
    refetchVehicleData,
    hasInitialLoad,
  } = useVehicleData(modelName);

  // Monitor session ready state and trigger refetch only once when session becomes ready
  const [hasTriggeredSessionRefetch, setHasTriggeredSessionRefetch] =
    useState(false);
  const [sessionStableTimeout, setSessionStableTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [lastRefetchTime, setLastRefetchTime] = useState(0);

  useEffect(() => {
    if (!isSessionReady) {
      console.log("[RentCar] Waiting for session to be ready...");
      return;
    }

    // Clear any existing timeout
    if (sessionStableTimeout) {
      clearTimeout(sessionStableTimeout);
      setSessionStableTimeout(null);
    }

    const now = Date.now();
    const REFETCH_COOLDOWN = 5000; // 5 second cooldown between refetches

    // Only trigger refetch if session is ready and we haven't fetched recently
    if (
      isSessionReady &&
      (!hasTriggeredSessionRefetch ||
        now - lastRefetchTime > REFETCH_COOLDOWN) &&
      (carModels.length === 0 || !hasInitialLoad) &&
      !isLoadingModels
    ) {
      console.log("[RentCar] Session ready, scheduling vehicle data fetch");

      // Add a small delay to ensure session state is stable
      const timeout = setTimeout(() => {
        if (isSessionReady && now - lastRefetchTime > REFETCH_COOLDOWN) {
          console.log("[RentCar] Triggering vehicle data fetch");
          setHasTriggeredSessionRefetch(true);
          setLastRefetchTime(Date.now());
          if (refetchVehicleData) {
            refetchVehicleData();
          }
        }
      }, 200); // Reduced delay for faster response

      setSessionStableTimeout(timeout);
    }

    return () => {
      if (sessionStableTimeout) {
        clearTimeout(sessionStableTimeout);
      }
    };
  }, [
    isSessionReady,
    hasTriggeredSessionRefetch,
    carModels.length,
    isLoadingModels,
    hasInitialLoad,
    refetchVehicleData,
    lastRefetchTime,
  ]);

  // Listen for session restored events to trigger vehicle refetch
  useEffect(() => {
    const handleSessionRestored = (event: CustomEvent) => {
      console.log("[RentCar] Session restored event received:", event.detail);
      const userData = event.detail;

      if (userData && userData.id && userData.email) {
        const now = Date.now();
        const REFETCH_COOLDOWN = 5000; // 5 second cooldown between refetches

        // Check if we should skip this refetch due to cooldown or existing fetch
        if (now - lastRefetchTime < REFETCH_COOLDOWN) {
          console.log(
            "[RentCar] Skipping session restore refetch - cooldown active",
          );
          return;
        }

        if (isLoadingModels) {
          console.log(
            "[RentCar] Skipping session restore refetch - already loading",
          );
          return;
        }

        console.log(
          "[RentCar] Valid session restored, triggering vehicle refetch",
        );

        // Reset refetch state to allow new fetch
        setHasTriggeredSessionRefetch(false);

        // Trigger vehicle data refetch after a short delay
        setTimeout(() => {
          if (refetchVehicleData) {
            const refetchStarted = refetchVehicleData();
            if (refetchStarted) {
              console.log(
                "[RentCar] Refetching vehicle data after session restore",
              );
              setLastRefetchTime(Date.now());
            } else {
              console.log(
                "[RentCar] Session restore refetch skipped - already in progress",
              );
            }
          }
        }, 500);
      }
    };

    window.addEventListener(
      "sessionRestored",
      handleSessionRestored as EventListener,
    );

    return () => {
      window.removeEventListener(
        "sessionRestored",
        handleSessionRestored as EventListener,
      );
    };
  }, [refetchVehicleData]);

  // Set document title based on language
  useEffect(() => {
    document.title = t("brand", "Premium Car Rental Service");
  }, [t, i18n.language]);

  // Handle auth form visibility based on authentication state
  useEffect(() => {
    if (isAuthenticated) {
      setShowAuthForm(false);
    }
  }, [isAuthenticated]);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState("vehicles");
  const [bookingData, setBookingData] = useState<any>(null);
  const [showInspection, setShowInspection] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "card">(
    "cash",
  );
  const [bankOption, setBankOption] = useState<"BCA" | "Mandiri" | "BRI">(
    "BCA",
  );
  const [cardType, setCardType] = useState<"Visa" | "Mastercard">("Visa");
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authFormType, setAuthFormType] = useState<"login" | "register">(
    "login",
  );
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [showModelDetail, setShowModelDetail] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
    // In a real implementation, you would apply the theme to the document
    // document.documentElement.classList.toggle('dark');
  };

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setActiveTab("booking");

    // Check if user is authenticated when selecting a vehicle
    if (!isAuthenticated) {
      // We don't block selection, but we'll show auth modal when they try to book
      console.log(
        "User not authenticated, will prompt for login at booking step",
      );
    }
  };

  // Handle navigation to model detail page
  const handleViewModelDetail = (model: any) => {
    // Navigate to the model detail page with the model name in the URL
    const encodedModelName = encodeURIComponent(model.modelName.trim());
    console.log(
      `Navigating to model: ${model.modelName} (encoded: ${encodedModelName})`,
    );
    navigate(`/models/${encodedModelName}`);
    setSelectedModel(model);
    setShowModelDetail(true);
  };

  // Handle booking completion
  const handleBookingComplete = (data: any) => {
    // Authentication check removed - now handled in VehicleSelector
    setBookingData(data);
    setShowInspection(true);
    setActiveTab("inspection");
  };

  // Handle inspection completion
  const handleInspectionComplete = (data: any) => {
    console.log("Inspection completed:", data);
    // Move to payment tab instead of showing alert
    setShowPayment(true);
    setActiveTab("payment");

    // Calculate total amount based on booking data
    if (selectedVehicle && bookingData) {
      const days = bookingData.days || 1;
      const amount = selectedVehicle.daily_rate * days;
      setTotalAmount(amount);
      // Set default partial amount to 30% of total
      setPartialAmount(Math.round(amount * 0.3));
    }
  };

  // Handle payment completion
  const handlePaymentComplete = () => {
    const paymentDetails = {
      method: paymentMethod,
      type: paymentType,
      amount: paymentType === "full" ? totalAmount : partialAmount,
      bankOption: paymentMethod === "bank" ? bankOption : null,
      cardType: paymentMethod === "card" ? cardType : null,
    };

    console.log("Payment details:", paymentDetails);

    let message = "Payment completed successfully! ";

    if (paymentType === "partial") {
      const remaining = totalAmount - partialAmount;
      message += `You have paid Rp ${partialAmount.toLocaleString()} with remaining balance of Rp ${remaining.toLocaleString()}.`;
    } else {
      message += `You have paid the full amount of Rp ${totalAmount.toLocaleString()}.`;
    }

    message += " Your vehicle is ready for pickup.";

    alert(message);

    // Reset the flow
    setActiveTab("vehicles");
    setSelectedVehicle(null);
    setBookingData(null);
    setShowInspection(false);
    setShowPayment(false);
    setPaymentMethod("cash");
    setBankOption("BCA");
    setCardType("Visa");
    setPaymentType("full");
    setPartialAmount(0);
    setTotalAmount(0);
  };

  // Handle user logout
  const handleLogout = async () => {
    console.log("RentCar - Starting logout process");
    try {
      // Clear any pending auth forms first
      setShowAuthForm(false);

      // Clear all local state immediately
      setSelectedVehicle(null);
      setBookingData(null);
      setShowInspection(false);
      setShowPayment(false);
      setActiveTab("vehicles");

      // Call signOut from AuthContext which handles all cleanup
      await signOut();

      // Force page refresh and redirect to travel page
      console.log("RentCar - Forcing page refresh and redirect to travel page");
      window.location.replace("/sub-account");
    } catch (error) {
      console.error("RentCar - Error during logout:", error);
      // Force page refresh and redirect even if there's an error
      window.location.replace("/sub-account");
    }
  };

  const [customerName, setCustomerName] = useState<string | null>(null);

  return (
    <div
      className={`min-h-screen bg-background ${theme === "dark" ? "dark" : ""}`}
    >
      {/* Navbar */}
      <nav className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur-sm border-b border-border/60 py-4 px-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="bg-primary/10 p-1.5 rounded-full">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
              {t("brand", "CarRental")}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Globe className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <div className="grid gap-1">
                  <h4 className="font-medium mb-1">{t("language.select")}</h4>
                  <Button
                    variant={i18n.language === "en" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("en")}
                  >
                    {t("language.en")}
                  </Button>
                  <Button
                    variant={i18n.language === "id" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("id")}
                  >
                    {t("language.id")}
                  </Button>
                  <Button
                    variant={i18n.language === "zh" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("zh")}
                  >
                    {t("language.zh")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {/* Show auth-dependent UI when authenticated */}
            {isAuthenticated && (
              <div className="flex items-center space-x-4">
                {userRole === "Admin" && (
                  <Button
                    variant="default"
                    className="flex items-center gap-2 bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca"
                    onClick={() => navigate("/admin")}
                  >
                    <User className="h-4 w-4" />
                    {t("navbar.adminPanel")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => navigate("/profile")}
                >
                  <User className="h-4 w-4" />
                  {userName
                    ? userName
                    : userEmail?.split("@")[0] || t("navbar.myAccount")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700"
                >
                  {t("navbar.signOut", "Sign Out")}
                </Button>
              </div>
            )}

            {/* Show sign in button when not authenticated */}
            {!isAuthenticated && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowAuthForm(true);
                  setAuthFormType("login");
                }}
              >
                {t("navbar.signIn", "Sign In")}
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted to-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
              {t("hero.title")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:bg-primary-dark cursor-pointer active:scale-95"
                onClick={() => {
                  window.location.href = "/rentcar";
                }}
              >
                <Car className="h-5 w-5" />
                {t("hero.browseCars")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:bg-secondary/50 hover:text-primary"
                onClick={() => {
                  // Navigate to the vehicle selection section of RentCar page
                  setActiveTab("vehicles");
                  // Scroll to the vehicle selection section
                  setTimeout(() => {
                    const vehicleSection = document.querySelector(
                      '[data-section="vehicles"]',
                    );
                    if (vehicleSection) {
                      vehicleSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }, 100);
                }}
              >
                <Calendar className="h-5 w-5" />
                {t("hero.bookNow")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:bg-secondary/50 hover:text-primary"
                onClick={() => navigate("/airport-transfer")}
              >
                <Plane className="h-5 w-5" />
                {t("hero.airportTransfer", "Airport Transfer")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 container mx-auto px-4">
        {showAuthForm && !isAuthenticated ? (
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {authFormType === "login"
                  ? t("navbar.signIn")
                  : t("navbar.register", "Register")}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAuthForm(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <AuthForm
                  onAuthStateChange={(state) => {
                    console.log("Auth state changed to:", state);

                    // Always close the auth form when authentication is successful
                    if (state) {
                      console.log("Authentication successful, closing form");
                      setShowAuthForm(false);

                      // Check for return path in window history state
                      const historyState = window.history.state;
                      if (historyState && historyState.returnPath) {
                        const { returnPath, returnState } = historyState;
                        console.log("Redirecting to:", returnPath, returnState);
                        // Clear the history state before navigation
                        window.history.replaceState(null, "");
                        navigate(returnPath, { state: returnState });
                      } else {
                        // No return path, just refresh the current page state
                        console.log("No return path, staying on current page");
                      }
                    }
                  }}
                  initialTab={authFormType}
                  onClose={() => {
                    console.log("Auth form closed");
                    setShowAuthForm(false);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        ) : showModelDetail && selectedModel ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold">
                  {selectedModel.modelName}
                </h2>
                <p className="text-muted-foreground">
                  {selectedModel.availableCount} unit
                  {selectedModel.availableCount !== 1 ? "s" : ""} available
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowModelDetail(false);
                  navigate("/");
                }}
              >
                Back to Models
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedModel.vehicles.map((vehicle) => (
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
                          }).format(vehicle.daily_rate)}
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
                      onClick={() => {
                        if (vehicle.available) {
                          // Use the vehicle directly since it's already the correct Vehicle type from useVehicleData
                          handleSelectVehicle(vehicle);
                        }
                      }}
                    >
                      {vehicle.available
                        ? t("booking.bookNow", "Book Now")
                        : t("booking.notAvailable", "Not Available")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 relative inline-block">
                Our Car Models
                <span className="absolute bottom-0 left-0 w-full h-1 bg-primary/30 rounded-full"></span>
              </h2>
              <p className="text-muted-foreground text-lg mt-4 mb-6">
                Choose from our wide selection of car models for your next
                journey
              </p>
            </div>

            {(isLoadingModels && !hasInitialLoad) || !isSessionReady ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">
                  {!isSessionReady
                    ? "Loading session..."
                    : "Loading vehicles..."}
                </span>
              </div>
            ) : vehicleError ? (
              <div className="text-center py-12">
                <Car className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
                <h3 className="text-xl font-medium mt-4">
                  Error loading vehicles
                </h3>
                <p className="text-muted-foreground mt-2">{vehicleError}</p>
                <Button
                  onClick={() => {
                    console.log("[RentCar] Retrying vehicle data fetch");
                    if (refetchVehicleData) {
                      refetchVehicleData();
                    }
                  }}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            ) : carModels.length === 0 ? (
              <div className="text-center py-12">
                <Car className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
                <h3 className="text-xl font-medium mt-4">
                  No vehicles available at the moment
                </h3>
                <p className="text-muted-foreground mt-2">
                  Please check back later or contact support
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {carModels.map((model) => (
                  <CarModelCard
                    key={model.modelName}
                    modelName={model.modelName}
                    availableCount={model.availableCount}
                    imageUrl={model.imageUrl}
                    onViewDetail={() => {
                      handleViewModelDetail(model);
                    }}
                  />
                ))}
              </div>
            )}

            <div
              className="mt-12 pt-8 border-t border-border"
              data-section="vehicles"
            >
              <div className="text-center max-w-3xl mx-auto mb-8">
                <h2 className="text-2xl font-bold mb-2">
                  Continue Your Booking
                </h2>
                <p className="text-muted-foreground">
                  If you've already selected a vehicle, you can continue your
                  booking process below
                </p>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
           {/*     <TabsList className="grid w-full max-w-md mx-auto grid-cols-4">
                  <TabsTrigger value="vehicles">
                    {t("booking.selectVehicle")}
                  </TabsTrigger>
                  <TabsTrigger value="booking">
                    {t("booking.bookingDetails")}
                  </TabsTrigger>
                  <TabsTrigger value="inspection" disabled={!showInspection}>
                    {t("booking.inspection")}
                  </TabsTrigger>
                  <TabsTrigger value="payment" disabled={!showPayment}>
                    {t("booking.payment")}
                  </TabsTrigger>
                </TabsList>*/}
                <TabsContent value="vehicles" className="mt-6">
                  <VehicleSelector onSelectVehicle={handleSelectVehicle} />
                </TabsContent>
                <TabsContent value="booking" className="mt-6">
                  <BookingForm
                    selectedVehicle={selectedVehicle}
                    onBookingComplete={handleBookingComplete}
                  />
                </TabsContent>
                <TabsContent value="inspection" className="mt-6">
                  {bookingData && (
                    <PreRentalInspectionForm
                      vehicleId={bookingData.vehicleId}
                      bookingId={bookingData.bookingId}
                      onComplete={handleInspectionComplete}
                      onCancel={() => {
                        setActiveTab("booking");
                        setShowInspection(false);
                      }}
                    />
                  )}
                </TabsContent>
                <TabsContent value="payment" className="mt-6">
                  {bookingData && showPayment && (
                    <Card className="w-full max-w-2xl mx-auto">
                      <CardContent className="pt-6">
                        {/* Payment content remains the same */}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 relative">
            <span className="relative z-10">{t("whyChoose.title")}</span>
            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-primary rounded-full"></span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <Card className="border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
              <CardContent className="pt-8 p-6">
                <div className="text-center">
                  <div className="bg-primary/10 p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md">
                    <Car className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4">
                    {t("whyChoose.premiumVehicles")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("whyChoose.premiumVehiclesDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
              <CardContent className="pt-8 p-6">
                <div className="text-center">
                  <div className="bg-primary/10 p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4">
                    {t("whyChoose.flexibleBooking")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("whyChoose.flexibleBookingDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
              <CardContent className="pt-8 p-6">
                <div className="text-center">
                  <div className="bg-primary/10 p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md">
                    <CreditCard className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4">
                    {t("whyChoose.securePayments")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("whyChoose.securePaymentsDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="bg-primary/10 p-2 rounded-full">
                <Car className="h-7 w-7 text-primary" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
                {t("brand", "CarRental")}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {t("brand", "Car Rental Service")}.{" "}
              {t("footer.allRightsReserved")}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RentCar;