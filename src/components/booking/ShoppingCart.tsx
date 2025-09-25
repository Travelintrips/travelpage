import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart as CartIcon,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
  Loader2,
  ArrowLeft,
  Luggage,
  Plane,
  Car,
  Train,
  Hotel,
  Bus,
  MapPin,
  Compass,
  HandHeart,
} from "lucide-react";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

// Function to validate baggage_size
const validateBaggageSize = (
  size: string | null | undefined,
  defaultSize: string = "electronic" // fallback default
): string => {
  const allowedSizes = [
    "small",
    "medium",
    "large",
    "extra_large",
    "electronic",
    "surfingboard",
    "wheelchair",
    "stickgolf",
  ];

  if (typeof size === "string" && allowedSizes.includes(size.toLowerCase())) {
    return size.toLowerCase();
  }

  return defaultSize.toLowerCase();
};


interface ShoppingCartProps {}

const ShoppingCart: React.FC<ShoppingCartProps> = () => {
  // ALL HOOKS MUST BE DECLARED AT THE TOP LEVEL - NO CONDITIONAL HOOKS
  const navigate = useNavigate();
  const {
    isAuthenticated,
    userId,
    userEmail,
    userName,
    userRole,
    isLoading: authLoading,
    isHydrated,
    isCheckingSession,
  } = useAuth();

  const {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    totalAmount,
    checkout,
    isLoading,
    refetchCartData,
  } = useShoppingCart();

  // State hooks declared at the top level
  const [showReloadButton, setShowReloadButton] = React.useState(false);
  const [forceShowContent, setForceShowContent] = React.useState(false);
  const [isTabRecentlyActivated, setIsTabRecentlyActivated] =
    React.useState(false);

  // Function to load unpaid bookings - ALL useCallback hooks must be at top level
  const loadUnpaidBookings = React.useCallback(async () => {
    if (!isAuthenticated || !userId || !isHydrated || isLoading) {
      console.log("[ShoppingCart] Not ready for loading unpaid bookings", {
        isAuthenticated,
        userId,
        isHydrated,
        isLoading,
      });
      return;
    }

    try {
      console.log("[ShoppingCart] Loading unpaid bookings for user:", userId);
      // Fetch unpaid bookings from the bookings table
      const { data: unpaidBookings, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          vehicle_id,
          total_amount,
          start_date,
          end_date,
          pickup_time,
          driver_option,
          vehicles!bookings_vehicle_id_fkey (
            make,
            model,
            year
          )
        `,
        )
        .eq("user_id", userId)
        .eq("payment_status", "unpaid")
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching unpaid bookings:", error);
        return;
      }

      // Add unpaid bookings to cart if they're not already there
      if (unpaidBookings && unpaidBookings.length > 0) {
        console.log(
          "[ShoppingCart] Found",
          unpaidBookings.length,
          "unpaid bookings",
        );
        for (const booking of unpaidBookings) {
          // Check if booking is already in cart
          const existingItem = cartItems.find(
            (item) =>
              item.item_id === booking.id.toString() &&
              item.item_type === "car",
          );

          if (!existingItem) {
            const vehicleInfo = booking.vehicles as any;
            const serviceName = `${vehicleInfo?.make || "Unknown"} ${vehicleInfo?.model || "Vehicle"} ${vehicleInfo?.year ? `(${vehicleInfo.year})` : ""}`;

            await addToCart({
              item_type: "car",
              item_id: booking.id.toString(),
              service_name: serviceName,
              price: booking.total_amount,
              quantity: 1,
              details: {
                start_date: booking.start_date,
                end_date: booking.end_date,
                pickup_time: booking.pickup_time,
                driver_option: booking.driver_option,
                vehicle_id: booking.vehicle_id,
              },
            });
          }
        }
      } else {
        console.log("[ShoppingCart] No unpaid bookings found");
      }
    } catch (error) {
      console.error("Error loading unpaid bookings:", error);
    }
  }, [isAuthenticated, userId, isHydrated, isLoading, addToCart, cartItems]);

  // Load unpaid bookings into cart on component mount and when auth state changes
  React.useEffect(() => {
    if (!isHydrated) return; // 🎯 Wait for hydration

    // Only load once when auth state is ready
    if (
      isAuthenticated &&
      userId &&
      !isCheckingSession &&
      userRole &&
      !isLoading
    ) {
      console.log("[ShoppingCart] Auth state ready, loading unpaid bookings", {
        isAuthenticated,
        userId,
        userRole,
      });
      loadUnpaidBookings();
    }
  }, [
    isAuthenticated,
    userId,
    userRole,
    isHydrated,
    isCheckingSession,
    isLoading,
    loadUnpaidBookings,
  ]);

  // Enhanced visibility change handler to prevent loading issues
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let tabActivationTimeout: NodeJS.Timeout;
    let lastVisibilityTime = 0;
    const VISIBILITY_COOLDOWN = 1000; // Reduced to 1 second cooldown

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastVisibilityTime < VISIBILITY_COOLDOWN) {
          console.log(
            "[ShoppingCart] Visibility change cooldown active, skipping",
          );
          return;
        }
        lastVisibilityTime = now;

        console.log(
          "[ShoppingCart] Tab became visible, refreshing cart immediately",
        );

        // Clear any existing timeouts
        if (timeoutId) clearTimeout(timeoutId);
        if (tabActivationTimeout) clearTimeout(tabActivationTimeout);

        // Immediately try to refresh cart data without waiting
        try {
          // Always try to refresh cart data when tab becomes visible
          console.log("[ShoppingCart] Refreshing cart data on tab focus");
          await refetchCartData();

          // Reset any loading states that might be stuck
          setForceShowContent(false);
          setShowReloadButton(false);
        } catch (error) {
          console.error(
            "[ShoppingCart] Error refreshing cart on tab focus:",
            error,
          );
          // Force show content on error to prevent infinite loading
          setForceShowContent(true);
        }
      }
    };

    // Listen for session restored events
    const handleSessionRestored = async () => {
      console.log("[ShoppingCart] Session restored, refreshing cart");
      try {
        await refetchCartData();
        setForceShowContent(false);
        setShowReloadButton(false);
      } catch (error) {
        console.error(
          "[ShoppingCart] Error refreshing cart after session restore:",
          error,
        );
        // Force show content on error
        setForceShowContent(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("sessionRestored", handleSessionRestored);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("sessionRestored", handleSessionRestored);
      if (timeoutId) clearTimeout(timeoutId);
      if (tabActivationTimeout) clearTimeout(tabActivationTimeout);
    };
  }, [isAuthenticated, userId, userRole, refetchCartData]);

  // Effect for managing loading timeouts and force content display - MOVED TO TOP LEVEL
  React.useEffect(() => {
    let loadingTimeout: NodeJS.Timeout;
    let forceTimeout: NodeJS.Timeout;

    // Show reload button if loading persists for more than 2 seconds
    const shouldShowLoading =
      isLoading && cartItems.length === 0 && !isTabRecentlyActivated;

    if (shouldShowLoading) {
      loadingTimeout = setTimeout(() => {
        console.log(
          "[ShoppingCart] Loading timeout reached, showing reload button",
        );
        setShowReloadButton(true);
      }, 2000); // Reduced to 2 seconds

      // Force show content after 4 seconds to prevent infinite loading
      forceTimeout = setTimeout(() => {
        console.log(
          "[ShoppingCart] Force timeout reached, showing content anyway",
        );
        setForceShowContent(true);
        setShowReloadButton(false);
      }, 4000); // Reduced to 4 seconds
    } else {
      setShowReloadButton(false);
      if (!isLoading) {
        setForceShowContent(false);
      }
    }

    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      if (forceTimeout) clearTimeout(forceTimeout);
    };
  }, [isLoading, cartItems.length, isTabRecentlyActivated]);

  // 🎯 BLOCKING GUARD: Prevent rendering until session is hydrated
  if (!isHydrated || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Loading session...
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Please wait while we restore your session
          </p>
        </div>
      </div>
    );
  }

  const handleRemoveItem = async (id: string) => {
    try {
      await removeFromCart(id);
      toast({
        title: "Item removed",
        description: "Item successfully removed from cart.",
      });
    } catch (error) {
      console.error("Error removing item:", error);
      toast({
        title: "Failed to remove item",
        description: "An error occurred while removing item from cart.",
        variant: "destructive",
      });
    }
  };

  const handleClearCart = async (id:string) => {
    try {
      await clearCart(id);
      toast({
        title: "Cart cleared",
        description: "All items successfully removed from cart.",
      });
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast({
        title: "Failed to clear cart",
        description: "An error occurred while clearing the cart.",
        variant: "destructive",
      });
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case "baggage":
        return "Baggage";
      case "airport_transfer":
        return "Airport Transfer";
      case "handling":
        return "Handling";
      case "car":
        return "Car Rental";
      default:
        return type;
    }
  };

  // Product suggestions for empty cart
  const productSuggestions = [
    {
      name: "Baggage",
      icon: Luggage,
      route: "/baggage",
      description: "Secure baggage storage services",
    },
    {
      name: "Airport Transfer",
      icon: MapPin,
      route: "/airport-transfer",
      description: "Convenient airport transportation",
    },
    {
      name: "Car Rental",
      icon: Car,
      route: "/rentcar",
      description: "Premium vehicle rentals",
    },
    {
      name: "Handling",
      icon: HandHeart,
      route: "/handling",
      description: "Airport handling assistance services",
    },
    {
      name: "Flights",
      icon: Plane,
      route: "/flights",
      description: "Book domestic and international flights",
    },
    {
      name: "Trains",
      icon: Train,
      route: "/trains",
      description: "Comfortable train journeys",
    },
    {
      name: "Hotels",
      icon: Hotel,
      route: "/hotels",
      description: "Quality accommodation options",
    },
    {
      name: "Bus",
      icon: Bus,
      route: "/bus-travel",
      description: "Affordable bus transportation",
    },
    {
      name: "Activities",
      icon: Compass,
      route: "/things-to-do",
      description: "Exciting travel experiences",
    },
  ];

  // Add debug logs
  console.log("Cart Page: userRole", userRole);
  console.log("Cart Page: isAuthenticated", isAuthenticated);
  console.log("Cart Page: isHydrated", isHydrated);
  console.log("Cart Page: isCheckingSession", isCheckingSession);
  console.log("Cart Page: authLoading", authLoading);
  console.log("Cart Page: userId", userId);
  console.log("Cart Page: isLoading", isLoading);
  console.log("Cart Page: cartItems.length", cartItems.length);

  // Show sign in prompt only if we're completely sure user is not authenticated
  const shouldShowSignInPrompt =
    !isAuthenticated &&
    !authLoading &&
    !userId &&
    !isCheckingSession &&
    isHydrated &&
    !localStorage.getItem("auth_user") &&
    forceShowContent &&
    !localStorage.getItem("userId");

  if (shouldShowSignInPrompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to view your cart.
          </p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  // Show loading only when cart is actually loading and we have no items
  // But don't show loading if we have stored user data (fallback available) or tab was recently activated
  const hasStoredUserData =
    localStorage.getItem("auth_user") || localStorage.getItem("userId");
  const shouldShowLoadingScreen =
    !forceShowContent &&
    isLoading &&
    cartItems.length === 0 &&
    !authLoading &&
    !isCheckingSession &&
    !isTabRecentlyActivated;
  // Removed hasStoredUserData check to allow loading even with stored data

  if (shouldShowLoadingScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <span className="text-lg mb-4">Loading cart...</span>
          {showReloadButton && (
            <Button
              onClick={async () => {
                console.log("[ShoppingCart] Manual reload triggered");
                setShowReloadButton(false);
                try {
                  await refetchCartData();
                } catch (error) {
                  console.error("[ShoppingCart] Manual reload failed:", error);
                  window.location.reload();
                }
              }}
              variant="outline"
              className="mt-4"
            >
              Reload Cart
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Page layout for shopping cart
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="mr-2"
                title="Back to Baggage"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              <h1 className="text-lg sm:text-2xl font-bold">Shopping Cart</h1>
              {cartItems.length > 0 && (
                <Badge variant="secondary">{cartItems.length}</Badge>
              )}
            </div>

            <div className="space-y-6">
              {/* Always show cart items if they exist, regardless of loading state */}
              {cartItems.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {cartItems.map((item) => {
                      // Debug log to see the actual item_type
                      console.log("Cart item:", {
                        id: item.id,
                        item_type: item.item_type,
                        service_name: item.service_name,
                      });

                      return (
                        <Card key={item.id} className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <Badge variant="outline">
                                  {getItemTypeLabel(item.item_type)}
                                </Badge>
                                {item.status && (
                                  <Badge
                                    variant={
                                      item.status === "paid"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {item.status}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium text-lg">
                                {(() => {
                                  // Create display names mapping
                                  const displayNames: Record<string, string> = {
                                    small: "Small",
                                    medium: "Medium",
                                    large: "Large",
                                    extra_large: "Extra Large",
                                    electronic: "Electronic",
                                    surfingboard: "Surfing Board",
                                    wheelchair: "Wheel Chair",
                                    stickgolf: "Stick Golf",
                                  };

                                  // Utility function to get display name with proper fallback
                                  const getDisplayName = (item_type: string, service_name?: string) => {
                                    return (
                                      displayNames[item_type.toLowerCase()] ||
                                      service_name ||
                                      item_type ||
                                      "Unknown"
                                    );
                                  };

                                  // If service_name contains "Unknown", try to fix it using item_id
                                  if (item.service_name && item.service_name.includes("Unknown") && item.item_id) {
                                    const fixedDisplayName = getDisplayName(item.item_id);
                                    return `Baggage Storage – ${fixedDisplayName}`;
                                  }

                                  // Otherwise return the original service_name
                                  return item.service_name;
                                })()}
                              </h3>

                              {/* Baggage Details Information - Enhanced display */}
                              {item.item_type === "baggage" &&
                                item.details &&
                                (() => {
                                  // Parse details if it's a JSON string, otherwise use as object
                                  let parsedDetails = item.details;
                                  if (typeof item.details === "string") {
                                    try {
                                      parsedDetails = JSON.parse(item.details);
                                    } catch (error) {
                                      console.error(
                                        "Error parsing item details JSON:",
                                        error,
                                      );
                                      parsedDetails = item.details;
                                    }
                                  }

                                  return (
                                    <div className="mt-3 space-y-1">
                                      {/* Booking ID - Priority display */}
                                      {(parsedDetails.booking_code ||
                                        parsedDetails.booking_id) && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Booking ID:
                                          </span>{" "}
                                          <span className="font-mono text-blue-600">
                                            {parsedDetails.booking_code ||
                                              parsedDetails.booking_id}
                                          </span>
                                        </p>
                                      )}

                                      {/* Customer Information */}
                                      {parsedDetails.customer_name && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Customer:
                                          </span>{" "}
                                          {parsedDetails.customer_name}
                                        </p>
                                      )}
                                      {parsedDetails.customer_email && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Email:
                                          </span>{" "}
                                          {parsedDetails.customer_email}
                                        </p>
                                      )}
                                      {parsedDetails.customer_phone && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Phone:
                                          </span>{" "}
                                          {parsedDetails.customer_phone}
                                        </p>
                                      )}

                                      {/* Baggage Information */}
                                      {(parsedDetails.baggage_size || parsedDetails.baggage_size_display) && (
  <p className="text-sm text-gray-600">
    <span className="font-medium">Baggage Size:</span>{" "}
    {(() => {
      // Create display names mapping
      const displayNames: Record<string, string> = {
        small: "Small",
        medium: "Medium",
        large: "Large",
        extra_large: "Extra Large",
        electronic: "Electronic",
        surfingboard: "Surfing Board",
        wheelchair: "Wheel Chair",
        stickgolf: "Stick Golf",
      };

      // Utility function to get display name with proper fallback
      const getDisplayName = (item_type: string, service_name?: string) => {
        return (
          displayNames[item_type.toLowerCase()] ||
          service_name ||
          item_type ||
          "Unknown"
        );
      };

      // Use display name if available
      if (parsedDetails.baggage_size_display) {
        return parsedDetails.baggage_size_display;
      }

      // Validate and normalize baggage_size
      const validatedSize =
        validateBaggageSize(parsedDetails.baggage_size) ?? "electronic";

      // Return proper display name using utility function
      return getDisplayName(validatedSize);
    })()}
  </p>
)}
{parsedDetails.item_name && (
  <p className="text-sm text-gray-600">
    <span className="font-medium">Item Name:</span>{" "}
    {parsedDetails.item_name}
  </p>
)}

                                      {parsedDetails.flight_number &&
                                        parsedDetails.flight_number !== "-" && (
                                          <p className="text-sm text-gray-600">
                                            <span className="font-medium">
                                              Flight Number:
                                            </span>{" "}
                                            {parsedDetails.flight_number}
                                          </p>
                                        )}

                                      {/* Location Information */}
                                      {parsedDetails.airport && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Airport:
                                          </span>{" "}
                                          {parsedDetails.airport}
                                        </p>
                                      )}
                                      {parsedDetails.terminal && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Terminal:
                                          </span>{" "}
                                          {parsedDetails.terminal}
                                        </p>
                                      )}
                                      {parsedDetails.storage_location && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Storage Location:
                                          </span>{" "}
                                          {parsedDetails.storage_location}
                                        </p>
                                      )}

                                      {/* Duration and Time Information */}
                                      {parsedDetails.duration && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Duration:
                                          </span>{" "}
                                          {parsedDetails.duration}{" "}
                                          {parsedDetails.duration_type ===
                                          "days"
                                            ? "day(s)"
                                            : "hour(s)"}
                                        </p>
                                      )}
                                      {parsedDetails.start_date && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Start Date:
                                          </span>{" "}
                                          {new Date(
                                            parsedDetails.start_date,
                                          ).toLocaleDateString("en-US", {
                                            weekday: "short",
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </p>
                                      )}
                                      {parsedDetails.start_time && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Start Time:
                                          </span>{" "}
                                          {parsedDetails.start_time}
                                        </p>
                                      )}
                                      {parsedDetails.duration_type === "days" &&
                                        parsedDetails.end_date && (
                                          <p className="text-sm text-gray-600">
                                            <span className="font-medium">
                                              End Date:
                                            </span>{" "}
                                            {new Date(
                                              parsedDetails.end_date,
                                            ).toLocaleDateString("en-US", {
                                              weekday: "short",
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </p>
                                        )}
                                      {parsedDetails.hours && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Hours:
                                          </span>{" "}
                                          {parsedDetails.hours}
                                        </p>
                                      )}
                                      {parsedDetails.notes && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Notes:
                                          </span>{" "}
                                          {parsedDetails.notes}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}

                              {/* Airport Transfer Information */}
                              {item.item_type === "airport_transfer" &&
                                item.details &&
                                (() => {
                                  // Parse details if it's a JSON string, otherwise use as object
                                  let parsedDetails = item.details;
                                  if (typeof item.details === "string") {
                                    try {
                                      parsedDetails = JSON.parse(item.details);
                                    } catch (error) {
                                      console.error(
                                        "Error parsing airport transfer details JSON:",
                                        error,
                                      );
                                      parsedDetails = item.details;
                                    }
                                  }

                                  const isInstantBooking =
                                    parsedDetails.bookingType === "instant";
                                  const isScheduleBooking =
                                    parsedDetails.bookingType === "scheduled";

                                  return (
                                    <div className="mt-3 space-y-1">
                                      {/* Booking Code */}
                                      {parsedDetails.codeBooking && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Booking Code:
                                          </span>{" "}
                                          {parsedDetails.codeBooking}
                                        </p>
                                      )}

                                      {/* Booking Type */}
                                      {parsedDetails.bookingType && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Booking Type:
                                          </span>{" "}
                                          {parsedDetails.bookingType ===
                                          "instant"
                                            ? "Instant Booking"
                                            : "Schedule Booking"}
                                        </p>
                                      )}

                                      {/* Vehicle Type - for both booking types */}
                                      {parsedDetails.vehicleType && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Vehicle Type:
                                          </span>{" "}
                                          {parsedDetails.vehicleType}
                                        </p>
                                      )}

                                      {/* Pickup Date and Time - for both booking types */}
                                      {parsedDetails.pickupDate && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Pickup Date:
                                          </span>{" "}
                                          {new Date(
                                            parsedDetails.pickupDate,
                                          ).toLocaleDateString("en-US", {
                                            weekday: "short",
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </p>
                                      )}
                                      {parsedDetails.pickupTime && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Pickup Time:
                                          </span>{" "}
                                          {parsedDetails.pickupTime}
                                        </p>
                                      )}

                                      {/* Driver Information */}
                                      {parsedDetails.driverName && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Driver:
                                          </span>
                                          <span>
                                            {parsedDetails.driverName}
                                          </span>
                                        </div>
                                      )}

                                      {/* Driver ID */}
                                      {(parsedDetails.id_driver ||
                                        parsedDetails.driverId) && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Driver ID:
                                          </span>
                                          <span>
                                            {parsedDetails.id_driver ||
                                              parsedDetails.driverId}
                                          </span>
                                        </div>
                                      )}

                                      {/* Driver Phone */}
                                      {parsedDetails.driverPhone && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Driver Phone:
                                          </span>
                                          <span>
                                            {parsedDetails.driverPhone}
                                          </span>
                                        </div>
                                      )}

                                      {/* Vehicle Information */}
                                      {parsedDetails.vehicleName && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            Vehicle:
                                          </span>
                                          <span>
                                            {parsedDetails.vehicleName}
                                          </span>
                                        </div>
                                      )}

                                      {parsedDetails.vehiclePlate && (
                                        <div className="flex justify-between">
                                          <span className="font-medium text-gray-600">
                                            License Plate:
                                          </span>
                                          <span>
                                            {parsedDetails.vehiclePlate}
                                          </span>
                                        </div>
                                      )}

                                      {/* Passengers */}
                                      {parsedDetails.passenger && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Passengers:
                                          </span>{" "}
                                          {parsedDetails.passenger}
                                        </p>
                                      )}

                                      {/* Pickup and Dropoff Locations */}
                                      {parsedDetails.fromAddress && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Pickup:
                                          </span>{" "}
                                          {parsedDetails.fromAddress}
                                        </p>
                                      )}
                                      {parsedDetails.toAddress && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Dropoff:
                                          </span>{" "}
                                          {parsedDetails.toAddress}
                                        </p>
                                      )}

                                      {/* Distance */}
                                      {parsedDetails.distance && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Distance:
                                          </span>{" "}
                                          {parsedDetails.distance} km
                                        </p>
                                      )}

                                      {/* Duration */}
                                      {parsedDetails.duration && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Duration:
                                          </span>{" "}
                                          {parsedDetails.duration} minutes
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}

                              {/* Handling Service Information */}
                              {item.item_type === "handling" &&
                                item.details &&
                                (() => {
                                  // Parse details if it's a JSON string, otherwise use as object
                                  let parsedDetails = item.details;
                                  if (typeof item.details === "string") {
                                    try {
                                      parsedDetails = JSON.parse(item.details);
                                    } catch (error) {
                                      console.error(
                                        "Error parsing handling details JSON:",
                                        error,
                                      );
                                      parsedDetails = item.details;
                                    }
                                  }

                                  return (
                                    <div className="mt-3 space-y-1">
                                      {/* Booking ID - Priority display */}
                                      {(parsedDetails.bookingId ||
                                        parsedDetails.booking_id) && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Booking ID:
                                          </span>{" "}
                                          <span className="font-mono text-blue-600">
                                            {parsedDetails.bookingId ||
                                              parsedDetails.booking_id}
                                          </span>
                                        </p>
                                      )}

                                      {/* Customer Information - Priority display */}
                                      {parsedDetails.customerName && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Customer:
                                          </span>{" "}
                                          {parsedDetails.customerName}
                                        </p>
                                      )}
                                      {parsedDetails.customerEmail && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Email:
                                          </span>{" "}
                                          {parsedDetails.customerEmail}
                                        </p>
                                      )}
                                      {parsedDetails.customerPhone && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Phone:
                                          </span>{" "}
                                          {parsedDetails.customerPhone}
                                        </p>
                                      )}

                                      {parsedDetails.travelType && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Travel Type:
                                          </span>{" "}
                                          {parsedDetails.travelType}
                                        </p>
                                      )}

                                      {parsedDetails.passengerArea && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Passenger Area:
                                          </span>{" "}
                                          {parsedDetails.passengerArea}
                                        </p>
                                      )}

                                      {parsedDetails.pickupArea && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Pickup Area:
                                          </span>{" "}
                                          {parsedDetails.pickupArea}
                                        </p>
                                      )}

                                      
                                      {parsedDetails.dropoffArea && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Dropoff Area:
                                          </span>{" "}
                                          {parsedDetails.dropoffArea}
                                        </p>
                                      )}

                                      {/* Category */}
                                      {parsedDetails.category && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Category:
                                          </span>{" "}
                                          {parsedDetails.category}
                                        </p>
                                      )}

                                      {/* Passengers - Only show for Group categories */}
                                      {parsedDetails.passengers &&
                                        parsedDetails.category &&
                                        parsedDetails.category.includes(
                                          "Group",
                                        ) && (
                                          <p className="text-sm text-gray-600">
                                            <span className="font-medium">
                                              Passengers:
                                            </span>{" "}
                                            {parsedDetails.passengers} orang
                                          </p>
                                        )}

                                      {/* Pickup Date */}
                                      {parsedDetails.pickupDate && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Date:
                                          </span>{" "}
                                          {new Date(
                                            parsedDetails.pickupDate,
                                          ).toLocaleDateString("en-US", {
                                            weekday: "short",
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </p>
                                      )}

                                      {/* Pickup Time */}
                                      {parsedDetails.pickupTime && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Time:
                                          </span>{" "}
                                          {parsedDetails.pickupTime}
                                        </p>
                                      )}

                                      {parsedDetails.additionalNotes && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Notes:
                                          </span>{" "}
                                          {parsedDetails.additionalNotes}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}

                              {/* Car Rental Information */}
                              {item.item_type === "car" &&
                                item.details &&
                                (() => {
                                  // Parse details if it's a JSON string, otherwise use as object
                                  let parsedDetails = item.details;
                                  if (typeof item.details === "string") {
                                    try {
                                      parsedDetails = JSON.parse(item.details);
                                    } catch (error) {
                                      console.error(
                                        "Error parsing car details JSON:",
                                        error,
                                      );
                                      parsedDetails = item.details;
                                    }
                                  }

                                  return (
                                    <div className="mt-3 space-y-1">
                                      {parsedDetails.start_date && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Pickup Date:
                                          </span>{" "}
                                          {new Date(
                                            parsedDetails.start_date,
                                          ).toLocaleDateString("en-US", {
                                            weekday: "short",
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </p>
                                      )}
                                      {parsedDetails.end_date && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Return Date:
                                          </span>{" "}
                                          {new Date(
                                            parsedDetails.end_date,
                                          ).toLocaleDateString("en-US", {
                                            weekday: "short",
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </p>
                                      )}
                                      {parsedDetails.pickup_time && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Pickup Time:
                                          </span>{" "}
                                          {parsedDetails.pickup_time}
                                        </p>
                                      )}
                                      {parsedDetails.driver_option && (
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Driver Option:
                                          </span>{" "}
                                          {parsedDetails.driver_option ===
                                          "self"
                                            ? "Self-drive"
                                            : "With Driver"}
                                        </p>
                                      )}
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Booking ID: {item.item_id}
                                      </Badge>
                                    </div>
                                  );
                                })()}

                              <p className="text-2xl font-semibold text-primary mt-2">
                                {formatCurrency(item.price)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={!isAuthenticated || !userId}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center text-xl font-semibold bg-gray-50 p-4 rounded-lg">
                    <span>Total:</span>
                    <span className="text-primary">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </>
              ) : isLoading && !forceShowContent ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-lg">Loading cart...</span>
                  {showReloadButton && (
                    <Button
                      onClick={async () => {
                        console.log("[ShoppingCart] Inline reload triggered");
                        setShowReloadButton(false);
                        try {
                          await refetchCartData();
                        } catch (error) {
                          console.error(
                            "[ShoppingCart] Inline reload failed:",
                            error,
                          );
                          setForceShowContent(true);
                        }
                      }}
                      variant="outline"
                      className="ml-4"
                    >
                      Reload
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CartIcon className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-xl font-medium text-muted-foreground mb-2">
                    Your shopping cart is empty
                  </p>
                  <p className="text-base text-muted-foreground mb-8">
                    Discover our amazing services and add items to your cart
                  </p>

                  {/* Product Suggestions */}
                  <div className="max-w-4xl mx-auto">
                    <h3 className="text-lg font-semibold mb-6 text-gray-900">
                      Explore Our Services
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {productSuggestions.map((product) => {
                        const Icon = product.icon;
                        return (
                          <Card
                            key={product.name}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(product.route)}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-3">
                                <Icon className="h-6 w-6 text-green-600" />
                              </div>
                              <h4 className="font-medium text-sm mb-2">
                                {product.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {product.description}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button
                variant="outline"
                onClick={handleClearCart}
                disabled={cartItems.length === 0 || !isAuthenticated || !userId}
                className="w-full sm:w-auto"
              >
                Clear Cart
              </Button>
              {isAuthenticated && userId ? (
                <Button
                  onClick={() => navigate("/checkout")}
                  disabled={cartItems.length === 0}
                  className="w-full sm:w-auto"
                >
                  Checkout ({formatCurrency(totalAmount)})
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full sm:w-auto bg-gray-300 text-gray-600 cursor-not-allowed"
                >
                  Please Sign in to Checkout
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;