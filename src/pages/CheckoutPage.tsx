import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

// UUID validation function
const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== "string") return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    userId,
    userEmail,
    userName,
    isHydrated,
    isLoading,
  } = useAuth();

  // 🎯 BLOCKING GUARD: Prevent rendering until session is hydrated
  if (!isHydrated || isLoading) {
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
  const { cartItems, totalAmount, clearCart } = useShoppingCart();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    () => {
      // Try to restore from sessionStorage
      return sessionStorage.getItem("checkout-payment-method") || "";
    },
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any | null>(() => {
    // Try to restore from sessionStorage
    const saved = sessionStorage.getItem("checkout-selected-bank");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error("Error parsing saved bank data:", error);
      }
    }
    return null;
  });
  const [manualBanks, setManualBanks] = useState<any[]>(() => {
    // Try to restore from sessionStorage
    const saved = sessionStorage.getItem("checkout-manual-banks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error("Error parsing saved banks data:", error);
      }
    }
    return [];
  });
  const [isFetchingBanks, setIsFetchingBanks] = useState(false);
  const [customerData, setCustomerData] = useState(() => {
    // Try to restore from sessionStorage first
    const saved = sessionStorage.getItem("checkout-customer-data");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error("Error parsing saved customer data:", error);
      }
    }
    return {
      name: "",
      email: "",
      phone: "",
    };
  });

  // WhatsApp message sending function
  const sendWhatsAppMessage = async (
    targetNumber: string,
    messageContent: string,
  ) => {
    try {
      const formData = new FormData();
      formData.append("target", targetNumber);
      formData.append("message", messageContent);

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization:
            import.meta.env.VITE_FONNTE_API_KEY ||
            import.meta.env.FONNTE_API_KEY ||
            "3hYIZghAc5N1!sUe3dMb",
        },
        body: formData,
      });

      const result = await response.json();
      console.log("Fonnte response:", result);
      return result;
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
    }
  };

  useEffect(() => {
    if (!isHydrated) return; // 🎯 Wait for hydration

    // Auto-fill customer data if user is authenticated
    if (isAuthenticated) {
      setCustomerData((prev) => {
        const newData = {
          name: userName || prev.name || "",
          email: userEmail || prev.email || "",
          phone: prev.phone || "", // Keep existing phone or will be fetched
        };
        // Save to sessionStorage
        sessionStorage.setItem(
          "checkout-customer-data",
          JSON.stringify(newData),
        );
        return newData;
      });
      fetchCustomerPhone();
    }
  }, [isAuthenticated, userName, userEmail, isHydrated]);

  // Add useEffect to validate cart and redirect if empty
  useEffect(() => {
    if (!userId || cartItems.length === 0) {
      console.log("[CheckoutPage] Cart validation: redirecting to home", {
        userId: !!userId,
        cartItemsLength: cartItems.length,
      });
      // Small delay to allow for cart loading
      const timer = setTimeout(() => {
        if (cartItems.length === 0) {
          navigate("/");
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userId, cartItems.length, navigate]);

  // Listen for form reset events
  useEffect(() => {
    const handleFormReset = () => {
      console.log("[CheckoutPage] Received form reset event");
      const resetData = {
        name: isAuthenticated ? userName || "" : "",
        email: isAuthenticated ? userEmail || "" : "",
        phone: "",
      };
      setCustomerData(resetData);
      setSelectedPaymentMethod("");
      setSelectedBank(null);

      // Clear sessionStorage
      sessionStorage.removeItem("checkout-customer-data");
      sessionStorage.removeItem("checkout-payment-method");
      sessionStorage.removeItem("checkout-selected-bank");
      sessionStorage.removeItem("checkout-manual-banks");
    };

    window.addEventListener("resetBookingForms", handleFormReset);
    return () => {
      window.removeEventListener("resetBookingForms", handleFormReset);
    };
  }, [isAuthenticated, userName, userEmail]);

  const fetchCustomerPhone = async () => {
    if (isAuthenticated && userId) {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("phone")
          .eq("id", userId)
          .single();

        if (!error && data?.phone) {
          setCustomerData((prev) => {
            const newData = { ...prev, phone: data.phone };
            // Save to sessionStorage
            sessionStorage.setItem(
              "checkout-customer-data",
              JSON.stringify(newData),
            );
            return newData;
          });
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    }
  };

  const fetchManualPaymentMethods = async (force = false) => {
    // Prevent multiple simultaneous fetches unless forced
    if (isFetchingBanks && !force) {
      console.log("🏦 Already fetching payment methods, skipping...");
      return;
    }

    setIsFetchingBanks(true);
    try {
      console.log("🏦 Fetching manual payment methods...");
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("type", "manual")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("❌ Error fetching manual payment methods:", error);
        return;
      }

      console.log("✅ Fetched payment methods:", data?.length || 0, "banks");
      console.log("📋 Bank details:", data);

      // Always update state, even if data is empty
      const banksData = data || [];
      setManualBanks(banksData);
      // Save to sessionStorage
      sessionStorage.setItem(
        "checkout-manual-banks",
        JSON.stringify(banksData),
      );

      // Force a re-render by updating a timestamp
      console.log(
        "🔄 Manual banks state updated at:",
        new Date().toISOString(),
      );
    } catch (error) {
      console.error("❌ Exception in fetchManualPaymentMethods:", error);
      // Don't clear existing banks on error, keep what we have
    } finally {
      setIsFetchingBanks(false);
    }
  };

  // Fetch manual payment methods when bank transfer is selected
  useEffect(() => {
    if (selectedPaymentMethod === "bank_transfer") {
      console.log("💳 Bank transfer selected, fetching payment methods...");
      fetchManualPaymentMethods(true); // Force fetch when payment method changes
    } else {
      // Clear banks when other payment method is selected
      setManualBanks([]);
      setSelectedBank(null);
    }
  }, [selectedPaymentMethod]);

  // Refetch payment methods when component mounts or becomes visible
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (!document.hidden && selectedPaymentMethod === "bank_transfer") {
        console.log("🔄 Tab became visible, refetching payment methods...");
        // Reset loading state and refetch
        setIsFetchingBanks(false);
        timeoutId = setTimeout(() => {
          fetchManualPaymentMethods(true);
        }, 100);
      }
    };

    const handleFocus = () => {
      if (selectedPaymentMethod === "bank_transfer") {
        console.log("🔄 Window focused, refetching payment methods...");
        // Reset loading state and refetch
        setIsFetchingBanks(false);
        timeoutId = setTimeout(() => {
          fetchManualPaymentMethods(true);
        }, 100);
      }
    };

    // Also fetch on component mount if bank transfer is already selected
    if (
      selectedPaymentMethod === "bank_transfer" &&
      manualBanks.length === 0 &&
      !isFetchingBanks
    ) {
      console.log(
        "🔄 Component mounted with bank transfer selected, fetching...",
      );
      fetchManualPaymentMethods(true);
    }

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedPaymentMethod, manualBanks.length, isFetchingBanks]);

  // Helper function to link payment with booking
  const linkPaymentBooking = async (
    paymentId: string,
    bookingId: string,
    bookingType: string,
  ) => {
    console.log("📦 Linking to payment_bookings:", {
      payment_id: paymentId,
      booking_id: bookingId,
      booking_type: bookingType,
    });

    const { error } = await supabase.from("payment_bookings").insert({
      payment_id: paymentId,
      booking_id: bookingId,
      booking_type: bookingType,
    });

    if (error) {
      console.error("❌ Error linking payment booking:", error);
      throw error;
    }

    console.log("✅ Successfully linked payment booking");
    return true;
  };

  const handlePayment = async () => {
    // Validate customer data
    if (!customerData.name || !customerData.email || !customerData.phone) {
      toast({
        title: "Complete customer data",
        description: "Please complete name, email, and phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "Select payment method",
        description: "Please select a payment method first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPaymentMethod === "bank_transfer" && !selectedBank) {
      toast({
        title: "Select bank",
        description: "Please select a bank for transfer.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      let paymentId = null;

      console.log("💰 Creating payment for total amount:", totalAmount);
      console.log("🛒 Processing", cartItems.length, "cart items");

      // Validate userId from auth context - CRITICAL for UUID type matching
      const validUserId = userId && isValidUUID(userId) ? userId : null;

      console.log("💰 User ID validation:", {
        originalUserId: userId,
        validUserId,
        isValid: !!validUserId,
        userIdType: typeof userId,
        userIdLength: userId?.length,
      });

      const paymentData: any = {
        amount: totalAmount,
        payment_method: selectedPaymentMethod,
        status: "pending",
        is_partial_payment: false,
        is_damage_payment: false,
        created_at: new Date().toISOString(),
      };

      // Only add user_id if it's a valid UUID to prevent type mismatch
      if (validUserId) {
        paymentData.user_id = validUserId;
      }
      // If no valid UUID, leave user_id as null (which is allowed by schema)

      console.log("💰 Payment data being inserted:", paymentData);

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error("❌ Error creating payment:", paymentError);
        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }

      paymentId = payment.id;
      console.log("✅ Payment created successfully:", paymentId);

      // Process each cart item and move to respective booking tables
      for (const item of cartItems) {
        console.log("🔄 Processing cart item:", {
          type: item.item_type,
          service: item.service_name,
          price: item.price,
        });

        if (item.item_type === "baggage" && item.details) {
          const bookingId = `BG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          // Parse details if it's a JSON string, otherwise use as object
          let parsedDetails = item.details;
          if (typeof item.details === "string") {
            try {
              parsedDetails = JSON.parse(item.details);
            } catch (error) {
              console.error("Error parsing item details JSON:", error);
              parsedDetails = item.details;
            }
          }

          const bookingData = {
            booking_id: bookingId,
            customer_name: customerData.name,
            customer_phone: customerData.phone,
            customer_email: customerData.email,
            item_name: parsedDetails.item_name || null,
            flight_number: parsedDetails.flight_number || "-",
            baggage_size:
              parsedDetails.baggage_size || item.details?.baggage_size,
            price: item.price,
            duration: parsedDetails.duration || item.details?.duration,
            storage_location:
              parsedDetails.storage_location ||
              item.details?.storage_location ||
              "Terminal 1, Level 1",
            start_date: parsedDetails.start_date || item.details?.start_date,
            end_date: parsedDetails.end_date || item.details?.end_date,
            start_time: parsedDetails.start_time || item.details?.start_time,
            end_time: "",
            airport: parsedDetails.airport || item.details?.airport,
            terminal: parsedDetails.terminal || item.details?.terminal,
            duration_type:
              parsedDetails.duration_type || item.details?.duration_type,
            hours: parsedDetails.hours || item.details?.hours,
            status: "confirmed",
            customer_id: validUserId, // Will be null if userId is not a valid UUID
            payment_id: paymentId,
          };

          const { data: baggageBooking, error: baggageError } = await supabase
            .from("baggage_booking")
            .insert(bookingData)
            .select()
            .single();

          if (baggageError) {
            console.error("❌ Error saving baggage booking:", baggageError);
            throw new Error(
              `Failed to save baggage booking: ${baggageError.message}`,
            );
          }

          console.log("✅ Baggage booking created:", baggageBooking.id);

          // Link to payment_bookings table
          await linkPaymentBooking(
            paymentId,
            baggageBooking.id.toString(),
            "baggage",
          );
        } else if (item.item_type === "airport_transfer" && item.details) {
          // Parse details for airport transfer
          let parsedDetails = item.details;
          if (typeof item.details === "string") {
            try {
              parsedDetails = JSON.parse(item.details);
            } catch (error) {
              console.error("Error parsing airport transfer details:", error);
              parsedDetails = item.details;
            }
          }

          // Create airport transfer booking
          const transferBookingData = {
            id: uuidv4(),
            customer_name: customerData.name,
            phone: customerData.phone,
            pickup_location:
              parsedDetails?.fromAddress ||
              parsedDetails?.pickup_location ||
              "Unknown",
            dropoff_location:
              parsedDetails?.toAddress ||
              parsedDetails?.dropoff_location ||
              "Unknown",
            pickup_date:
              parsedDetails?.pickupDate ||
              parsedDetails?.pickup_date ||
              new Date().toISOString().split("T")[0],
            pickup_time:
              parsedDetails?.pickupTime ||
              parsedDetails?.pickup_time ||
              "09:00",
            price: item.price,
            status: "confirmed",
            customer_id: validUserId, // Will be null if userId is not a valid UUID
            // Add additional fields from details
            vehicle_name:
              parsedDetails?.vehicleType || parsedDetails?.vehicle_name || null,
            driver_name: parsedDetails?.driver_name || null,
            id_driver: parsedDetails?.id_driver || null,
            license_plate: parsedDetails?.license_plate || null,
            distance: parsedDetails?.distance || null,
            duration: parsedDetails?.duration || null,
            type: parsedDetails?.type || "airport_transfer",
            created_at: new Date().toISOString(),
          };

          const { data: transferBooking, error: transferError } = await supabase
            .from("airport_transfer")
            .insert(transferBookingData)
            .select()
            .single();

          if (transferError) {
            console.error(
              "❌ Error creating airport transfer booking:",
              transferError,
            );
            throw new Error(
              `Failed to create airport transfer booking: ${transferError.message}`,
            );
          }

          console.log(
            "✅ Airport transfer booking created:",
            transferBooking.id,
          );

          // Link to payment_bookings table
          await linkPaymentBooking(
            paymentId,
            transferBooking.id.toString(),
            "airport_transfer",
          );

          // Send WhatsApp message for airport transfer booking
          if (customerData.phone) {
            const whatsappMessage = `Hello ${customerData.name},\n\nYour airport transfer booking has been confirmed!\n\nBooking Details:\n- Pickup: ${transferBookingData.pickup_location}\n- Dropoff: ${transferBookingData.dropoff_location}\n- Date: ${transferBookingData.pickup_date}\n- Time: ${transferBookingData.pickup_time}\n- Price: ${formatCurrency(item.price)}\n\nThank you for choosing our service!`;

            try {
              await sendWhatsAppMessage(customerData.phone, whatsappMessage);
              console.log("✅ WhatsApp message sent successfully");
            } catch (error) {
              console.error("❌ Failed to send WhatsApp message:", error);
              // Don't throw error - continue with checkout process
            }
          }
        } else if (item.item_type === "car" && item.details) {
          // Handle car rental bookings
          try {
            // Check if this is an existing booking (has item_id) or new booking
            if (item.item_id && !isNaN(Number(item.item_id))) {
              // Update existing booking
              const { data: carBookings, error: carBookingError } =
                await supabase
                  .from("bookings")
                  .update({ payment_status: "paid", payment_id: paymentId })
                  .eq("id", item.item_id)
                  .select();

              if (carBookingError) {
                console.error(
                  "❌ Error updating car booking:",
                  carBookingError,
                );
                // Log the error but continue processing other items
                console.warn(
                  `⚠️ Continuing with other items despite car booking error for ID: ${item.item_id}`,
                );
                continue;
              }

              // Check if any rows were updated
              if (!carBookings || carBookings.length === 0) {
                console.warn(
                  `⚠️ No car booking found with ID: ${item.item_id}`,
                );
                // Continue processing other items instead of throwing error
                continue;
              }

              const carBooking = carBookings[0];
              console.log("✅ Car booking updated:", carBooking.id);

              // Link to payment_bookings table
              await linkPaymentBooking(paymentId, carBooking.id, "car");
            } else {
              // Create new car rental booking
              let parsedDetails = item.details;
              if (typeof item.details === "string") {
                try {
                  parsedDetails = JSON.parse(item.details);
                } catch (error) {
                  console.error("Error parsing car rental details:", error);
                  parsedDetails = item.details;
                }
              }

              const bookingData = {
                customer_id: validUserId, // Will be null if userId is not a valid UUID
                vehicle_id: parsedDetails?.vehicle_id || item.item_id || null,
                total_amount: item.price,
                start_date:
                  parsedDetails?.start_date ||
                  new Date().toISOString().split("T")[0],
                end_date:
                  parsedDetails?.end_date ||
                  new Date(Date.now() + 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                pickup_time: parsedDetails?.pickup_time || "09:00",
                driver_option: parsedDetails?.driver_option || "self",
                status: "confirmed",
                payment_status: "paid",
                payment_id: paymentId,
                vehicle_name: parsedDetails?.vehicle_name || item.service_name,
                vehicle_type: parsedDetails?.vehicle_type || null,
                make: parsedDetails?.make || null,
                model: parsedDetails?.model || null,
                license_plate: parsedDetails?.license_plate || null,
                with_driver: parsedDetails?.with_driver || false,
                created_at: new Date().toISOString(),
              };

              const { data: carBooking, error: carBookingError } =
                await supabase
                  .from("bookings")
                  .insert(bookingData)
                  .select()
                  .single();

              if (carBookingError) {
                console.error(
                  "❌ Error creating car booking:",
                  carBookingError,
                );
                // Continue processing other items
                continue;
              }

              console.log("✅ Car booking created:", carBooking.id);

              // Link to payment_bookings table
              await linkPaymentBooking(paymentId, carBooking.id, "car");
            }
          } catch (linkError) {
            console.error("❌ Error processing car booking:", linkError);
            // Continue processing other items
            continue;
          }
        }

        // Update shopping_cart status to "paid" or delete the item
        if (isAuthenticated && userId) {
          try {
            const { error: updateError } = await supabase
              .from("shopping_cart")
              .update({ status: "paid" })
              .eq("id", item.id)
              .eq("user_id", userId);

            if (updateError) {
              console.error(
                "Error updating shopping cart status:",
                updateError,
              );
              // Continue processing other items even if this fails
            }
          } catch (cartError) {
            console.error("Exception updating shopping cart:", cartError);
            // Continue processing other items even if this fails
          }
        }
      }

      // Clear cart frontend (localStorage/context)
      await clearCart();
      console.log("🧹 Cart cleared successfully");

      // Reset customer data form (preserve authenticated user data)
      const resetData = isAuthenticated
        ? {
            name: userName || "",
            email: userEmail || "",
            phone: "", // Reset phone but keep name/email for authenticated users
          }
        : {
            name: "",
            email: "",
            phone: "",
          };

      setCustomerData(resetData);
      setSelectedPaymentMethod("");
      setSelectedBank(null);

      // Clear sessionStorage
      sessionStorage.removeItem("checkout-customer-data");
      sessionStorage.removeItem("checkout-payment-method");
      sessionStorage.removeItem("checkout-selected-bank");
      sessionStorage.removeItem("checkout-manual-banks");

      // Dispatch event to reset any cached form states
      window.dispatchEvent(new CustomEvent("resetBookingForms"));
      window.dispatchEvent(new CustomEvent("checkoutCompleted"));
      console.log("✅ Checkout form states reset");

      toast({
        title: "Payment successful!",
        description: "Thank you for your order. Redirecting to invoice...",
      });

      console.log("🎉 Checkout completed successfully! Payment ID:", paymentId);

      // Redirect to thank you page with payment ID
      setTimeout(() => {
        if (paymentId) {
          navigate(`/thank-you/${paymentId}`);
        } else {
          navigate("/");
        }
      }, 1500);
    } catch (error) {
      console.error("❌ Error during checkout:", error);
      toast({
        title: "Failed to process payment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const paymentMethods = [
    { id: "credit_card", name: "Credit Card", icon: CreditCard },
    { id: "bank_transfer", name: "Bank Transfer", icon: Banknote },
    { id: "cash", name: "Cash", icon: DollarSign },
    { id: "paylabs", name: "Paylabs", icon: Smartphone },
  ];

  // Redirect to cart if no items
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/cart")}
                  className="mr-2"
                  title="Back to Cart"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg sm:text-2xl font-bold">Checkout</h1>
              </div>
              <div className="text-center py-12">
                <p className="text-xl font-medium text-muted-foreground mb-2">
                  Your cart is empty
                </p>
                <p className="text-base text-muted-foreground mb-8">
                  Please add items to your cart before checkout
                </p>
                <Button onClick={() => navigate("/cart")}>Go to Cart</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/cart")}
                className="mr-2"
                title="Back to Cart"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg sm:text-2xl font-bold">Checkout</h1>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mt-1">
                Complete customer information and select payment method
              </p>
            </div>

            <div className="space-y-6">
              {/* Customer Information */}
              <div className="text-center">
                <h3 className="font-medium mb-4">Customer Information</h3>
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-left">
                    <Label htmlFor="customer-name" className="block mb-2">
                      Full Name
                    </Label>
                    <Input
                      id="customer-name"
                      value={customerData.name}
                      onChange={(e) =>
                        setCustomerData((prev) => {
                          const newData = {
                            ...prev,
                            name: e.target.value,
                          };
                          // Save to sessionStorage
                          sessionStorage.setItem(
                            "checkout-customer-data",
                            JSON.stringify(newData),
                          );
                          return newData;
                        })
                      }
                      placeholder="Enter full name"
                      disabled={isAuthenticated && !!userName}
                      className={
                        isAuthenticated && !!userName
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                  <div className="text-left">
                    <Label htmlFor="customer-email" className="block mb-2">
                      Email
                    </Label>
                    <Input
                      id="customer-email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) =>
                        setCustomerData((prev) => {
                          const newData = {
                            ...prev,
                            email: e.target.value,
                          };
                          // Save to sessionStorage
                          sessionStorage.setItem(
                            "checkout-customer-data",
                            JSON.stringify(newData),
                          );
                          return newData;
                        })
                      }
                      placeholder="Enter email"
                      disabled={isAuthenticated && !!userEmail}
                      className={
                        isAuthenticated && !!userEmail
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                  <div className="text-left">
                    <Label htmlFor="customer-phone" className="block mb-2">
                      Phone Number
                    </Label>
                    <Input
                      id="customer-phone"
                      value={customerData.phone}
                      onChange={(e) =>
                        setCustomerData((prev) => {
                          const newData = {
                            ...prev,
                            phone: e.target.value,
                          };
                          // Save to sessionStorage
                          sessionStorage.setItem(
                            "checkout-customer-data",
                            JSON.stringify(newData),
                          );
                          return newData;
                        })
                      }
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="max-w-2xl mx-auto">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-4 text-center">
                    Complete Order Summary
                  </h3>
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="border-b border-gray-200 pb-3 last:border-b-0"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {item.service_name}
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.item_type === "baggage" && "Baggage"}
                          {item.item_type === "airport_transfer" &&
                            "Airport Transfer"}
                          {item.item_type === "car" && "Car Rental"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total Amount:</span>
                    <span className="text-primary">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="text-center">
                <h3 className="font-medium mb-4">Payment Method</h3>
                <div className="max-w-md mx-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <Button
                          key={method.id}
                          variant={
                            selectedPaymentMethod === method.id
                              ? "default"
                              : "outline"
                          }
                          className="h-auto p-3 flex flex-col items-center gap-2"
                          onClick={() => {
                            console.log(
                              "💳 Payment method selected:",
                              method.id,
                            );
                            setSelectedPaymentMethod(method.id);
                            setSelectedBank(null); // Reset selected bank
                            // Save to sessionStorage
                            sessionStorage.setItem(
                              "checkout-payment-method",
                              method.id,
                            );
                            sessionStorage.removeItem("checkout-selected-bank");
                            // Immediately fetch payment methods for bank transfer
                            if (method.id === "bank_transfer") {
                              console.log(
                                "🏦 Immediately fetching banks for bank transfer...",
                              );
                              fetchManualPaymentMethods(true);
                            }
                          }}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs">{method.name}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Bank Selection for Bank Transfer */}
                  {selectedPaymentMethod === "bank_transfer" && (
                    <div className="border rounded-lg p-4 mt-4 text-left">
                      <h4 className="font-medium mb-3 text-center">
                        Select Bank
                      </h4>
                      {isFetchingBanks ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Loading banks...
                          </p>
                        </div>
                      ) : manualBanks.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {manualBanks.map((bank) => (
                            <div
                              key={bank.id}
                              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                                selectedBank?.id === bank.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                console.log("🏦 Bank selected:", bank.name);
                                setSelectedBank(bank);
                                // Save to sessionStorage
                                sessionStorage.setItem(
                                  "checkout-selected-bank",
                                  JSON.stringify(bank),
                                );
                              }}
                            >
                              <div className="font-medium">{bank.name}</div>
                              {bank.bank_name && (
                                <div className="text-sm text-gray-600">
                                  {bank.bank_name}
                                </div>
                              )}
                              {selectedBank?.id === bank.id && (
                                <div className="mt-2 text-sm space-y-1">
                                  {bank.account_holder && (
                                    <div>
                                      <span className="font-medium">
                                        Account Holder:
                                      </span>{" "}
                                      {bank.account_holder}
                                    </div>
                                  )}
                                  {bank.account_number && (
                                    <div>
                                      <span className="font-medium">
                                        Account Number:
                                      </span>{" "}
                                      {bank.account_number}
                                    </div>
                                  )}
                                  {bank.bank_code && (
                                    <div>
                                      <span className="font-medium">
                                        Bank Code:
                                      </span>{" "}
                                      {bank.bank_code}
                                    </div>
                                  )}
                                  {bank.branch && (
                                    <div>
                                      <span className="font-medium">
                                        Branch:
                                      </span>{" "}
                                      {bank.branch}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 mb-2">
                            No bank accounts found.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log(
                                "🔄 Retry button clicked, refetching banks...",
                              );
                              fetchManualPaymentMethods(true);
                            }}
                            disabled={isFetchingBanks}
                          >
                            {isFetchingBanks ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading...
                              </>
                            ) : (
                              "Retry"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => navigate("/cart")}
                disabled={isProcessingPayment}
                className="px-8"
              >
                Back to Cart
              </Button>
              <Button
                onClick={handlePayment}
                disabled={
                  !customerData.name ||
                  !customerData.email ||
                  !customerData.phone ||
                  !selectedPaymentMethod ||
                  (selectedPaymentMethod === "bank_transfer" &&
                    !selectedBank) ||
                  isProcessingPayment
                }
                className="px-8"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatCurrency(totalAmount)}`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
