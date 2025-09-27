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

// Function to validate text-based booking code format
const isValidBookingCode = (code: string): boolean => {
  if (!code || typeof code !== "string") return false;
  // Check for patterns like "BG-1234567890-ABC" or "AT-1234567890-ABC"
  const codeRegex = /^[A-Z]{2}-\d{10,}-[A-Z0-9]+$/;
  return codeRegex.test(code);
};

// Function to validate baggage_size
const validateBaggageSize = (
  size: string | null | undefined,
): string | null => {
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
  return null;
};

// Currency formatting function
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format pesan booking untuk WA
function formatBookingMessage(booking: any) { 
  // format duration gabungan
  const durationText =
    booking.duration && booking.duration_type
      ? `${booking.duration} ${booking.duration_type}`
      : "-";

  // format start date
  const startDate = booking.start_date
    ? new Date(booking.start_date).toLocaleDateString("id-ID")
    : "-";

  // format start time
  let startTime = "-";
  if (booking.start_time) {
    // jika start_time berupa "HH:MM" string
    startTime = booking.start_time;
    // atau jika start_time berupa timestamp, bisa pakai:
    // startTime = new Date(booking.start_time).toLocaleTimeString("id-ID", { hour: '2-digit', minute:'2-digit' });
  }

  return `
  === Details Order Baggage ===
Booking ID: ${booking.code_booking}
Baggage Storage – ${booking.baggage_size ?? "-"}
Customer: ${booking.customer_name}
Email: ${booking.customer_email ?? "-"}
Phone: ${booking.customer_phone ?? "-"}
Flight Number: ${booking.flight_number ?? "-"}
Terminal: ${booking.terminal ?? "-"}
Start Date: ${startDate}
Start Time: ${startTime}
Duration: ${durationText}
Item: ${booking.item_name ?? "-"}
Notes: ${booking.notes ?? "-"}
`;
}



export async function sendBookingWhatsApp(code_booking: string) {
  try {
    // ✅ Ambil data booking
    const { data, error } = await supabase
      .from("baggage_booking")
      .select("*")
      .eq("code_booking", code_booking)
      .single();

    if (error || !data) {
      console.error("Booking not found", error);
      return;
    }

    const message = formatBookingMessage(data);

    // ✅ Panggil Edge Function
    const { data: result, error: fnError } = await supabase.functions.invoke(
      "supabase-functions-send-whatsapp",
      {
        body: {
          target: data.customer_phone.startsWith("62")
            ? data.customer_phone
            : `62${data.customer_phone.replace(/^0+/, "")}`,
          message,
        },
      }
    );

    if (fnError) {
      console.error("Edge Function error:", fnError);
      return null;
    }

    console.log("WA API result:", result);
    return result;
  } catch (error) {
    console.error("Error sending baggage booking WhatsApp:", error);
    return null;
  }
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.split(":").slice(0, 2).join(":");
}
// Format pesan handling booking untuk WA
function formatHandlingBookingMessage(booking: any) {
  return `
  === Details Order Handling ===
Booking ID: ${booking.code_booking}
Handling Service – ${booking.category ?? "-"}
Customer: ${booking.customer_name}
Email: ${booking.customer_email ?? "-"}
Phone: ${booking.customer_phone ?? "-"}
Category: ${booking.category ?? "-"}
Passenger Area: ${booking.passenger_area ?? "-"}
${booking.pickup_area ? `Pickup Area: ${booking.pickup_area}` : ""}
${booking.dropoff_area ? `Dropoff Area: ${booking.dropoff_area}` : ""}
Pickup Date: ${booking.pickup_date ? new Date(booking.pickup_date).toLocaleDateString("id-ID") : "-"}
Pickup Time: ${formatTime(booking.pickup_time)}
${booking.passengers ? `Passengers: ${booking.passengers}` : ""}
${booking.travel_type ? `Travel Type: ${booking.travel_type}` : ""}
${booking.extra_baggage_count ? `Extra Baggage: ${booking.extra_baggage_count}` : ""}
Notes: ${booking.additional_notes ?? "-"}
`;
}

export async function sendHandlingBookingWhatsApp(code_booking: string) {
  try {
    // ✅ Ambil data handling booking
    const { data, error } = await supabase
      .from("handling_bookings")
      .select("*")
      .eq("code_booking", code_booking)
      .single();

    if (error || !data) {
      console.error("Handling booking not found", error);
      return;
    }

    const message = formatHandlingBookingMessage(data);

    // ✅ Panggil Edge Function
    const { data: result, error: fnError } = await supabase.functions.invoke(
      "supabase-functions-send-whatsapp",
      {
        body: {
          target: data.customer_phone.startsWith("62")
            ? data.customer_phone
            : `62${data.customer_phone.replace(/^0+/, "")}`,
          message,
        },
      }
    );

    if (fnError) {
      console.error("Edge Function error:", fnError);
      return null;
    }

    console.log("WA API result:", result);
    return result;
  } catch (error) {
    console.error("Error sending handling booking WhatsApp:", error);
    return null;
  }
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  
  // CRITICAL FIX: ALL hooks must be called at the very top, before any conditional logic
  const {
    isAuthenticated,
    userId,
    userEmail,
    userName,
    isHydrated,
    isLoading,
  } = useAuth();

  const { cartItems, totalAmount, clearCart } = useShoppingCart();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    () => {
      // Try to restore from sessionStorage
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem("checkout-payment-method") || "";
      }
      return "";
    },
  );
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any | null>(() => {
    // Try to restore from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem("checkout-selected-bank");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error("Error parsing saved bank data:", error);
        }
      }
    }
    return null;
  });
  const [manualBanks, setManualBanks] = useState<any[]>(() => {
    // Try to restore from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem("checkout-manual-banks");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error("Error parsing saved banks data:", error);
        }
      }
    }
    return [];
  });
  const [isFetchingBanks, setIsFetchingBanks] = useState(false);
  const [paylabsMethods, setPaylabsMethods] = useState<any[]>(() => {
    // Try to restore from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem("checkout-paylabs-methods");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error("Error parsing saved Paylabs methods data:", error);
        }
      }
    }
    return [];
  });
  const [isFetchingPaylabs, setIsFetchingPaylabs] = useState(false);
  const [selectedPaylabsMethod, setSelectedPaylabsMethod] = useState<
    any | null
  >(() => {
    // Try to restore from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem("checkout-selected-paylabs-method");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error("Error parsing saved Paylabs method data:", error);
        }
      }
    }
    return null;
  });
  const [customerData, setCustomerData] = useState(() => {
    // Try to restore from sessionStorage first
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem("checkout-customer-data");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error("Error parsing saved customer data:", error);
        }
      }
    }
    return {
      name: "",
      email: "",
      phone: "",
    };
  });

  // Function definitions must come before useEffect hooks that use them
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

  const fetchPaylabsPaymentMethods = async (force = false) => {
    // Prevent multiple simultaneous fetches unless forced
    if (isFetchingPaylabs && !force) {
      console.log("💳 Already fetching Paylabs methods, skipping...");
      return;
    }

    setIsFetchingPaylabs(true);
    try {
      console.log("💳 Fetching Paylabs payment methods...");
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("provider", "paylabs")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("❌ Error fetching Paylabs payment methods:", error);
        return;
      }

      console.log("✅ Fetched Paylabs methods:", data?.length || 0, "methods");
      console.log("📋 Paylabs method details:", data);

      // Always update state, even if data is empty
      const paylabsData = data || [];
      setPaylabsMethods(paylabsData);
      // Save to sessionStorage
      sessionStorage.setItem(
        "checkout-paylabs-methods",
        JSON.stringify(paylabsData),
      );

      // Force a re-render by updating a timestamp
      console.log(
        "🔄 Paylabs methods state updated at:",
        new Date().toISOString(),
      );
    } catch (error) {
      console.error("❌ Exception in fetchPaylabsPaymentMethods:", error);
      // Don't clear existing methods on error, keep what we have
    } finally {
      setIsFetchingPaylabs(false);
    }
  };

  // ALL useEffect hooks must be called here, before any conditional returns
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
      setSelectedPaylabsMethod(null);

      // Clear sessionStorage
      sessionStorage.removeItem("checkout-customer-data");
      sessionStorage.removeItem("checkout-payment-method");
      sessionStorage.removeItem("checkout-selected-bank");
      sessionStorage.removeItem("checkout-manual-banks");
      sessionStorage.removeItem("checkout-paylabs-methods");
      sessionStorage.removeItem("checkout-selected-paylabs-method");
      sessionStorage.removeItem("checkout-paylabs-methods");
      sessionStorage.removeItem("checkout-selected-paylabs-method");
    };

    window.addEventListener("resetBookingForms", handleFormReset);
    return () => {
      window.removeEventListener("resetBookingForms", handleFormReset);
    };
  }, [isAuthenticated, userName, userEmail]);

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

  // Fetch Paylabs payment methods when Paylabs is selected
  useEffect(() => {
    if (selectedPaymentMethod === "paylabs") {
      console.log("💳 Paylabs selected, fetching payment methods...");
      fetchPaylabsPaymentMethods(true); // Force fetch when payment method changes
    } else {
      // Clear Paylabs methods when other payment method is selected
      setPaylabsMethods([]);
      setSelectedPaylabsMethod(null);
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
      if (!document.hidden && selectedPaymentMethod === "paylabs") {
        console.log("🔄 Tab became visible, refetching Paylabs methods...");
        // Reset loading state and refetch
        setIsFetchingPaylabs(false);
        timeoutId = setTimeout(() => {
          fetchPaylabsPaymentMethods(true);
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
      if (selectedPaymentMethod === "paylabs") {
        console.log("🔄 Window focused, refetching Paylabs methods...");
        // Reset loading state and refetch
        setIsFetchingPaylabs(false);
        timeoutId = setTimeout(() => {
          fetchPaylabsPaymentMethods(true);
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

    // Also fetch on component mount if Paylabs is already selected
    if (
      selectedPaymentMethod === "paylabs" &&
      paylabsMethods.length === 0 &&
      !isFetchingPaylabs
    ) {
      console.log("💳 Component mounted with Paylabs selected, fetching...");
      fetchPaylabsPaymentMethods(true);
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
  }, [
    selectedPaymentMethod,
    manualBanks.length,
    isFetchingBanks,
    paylabsMethods.length,
    isFetchingPaylabs,
  ]);

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

  // WhatsApp message sending function
 /* const sendWhatsAppMessage = async (
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
  };*/

  // Helper function to link payment with booking
  const linkPaymentBooking = async (
    paymentId: string,
    bookingId: string,
    bookingType: string,
    codeBooking?: string,
  ) => {
    console.log("📦 Linking to payment_bookings:", {
      payment_id: paymentId,
      booking_id: bookingId,
      booking_type: bookingType,
      code_booking: codeBooking,
    });

    const { error } = await supabase.from("payment_bookings").insert({
      payment_id: paymentId,
      booking_id: bookingId,
      booking_type: bookingType,
      code_booking: codeBooking || null,
    });

    if (error) {
      console.error("❌ Error linking payment booking:", error);
      throw error;
    }

    console.log("✅ Successfully linked payment booking");
    return true;
  };

  // Function to calculate agent commission based on monthly passenger sales
  const calculateAgentCommission = (passengerCount: number): number => {
    if (passengerCount >= 1 && passengerCount <= 100) {
      return 40000; // Rp40.000
    } else if (passengerCount >= 101 && passengerCount <= 1000) {
      return 35000; // Rp35.000
    } else if (passengerCount >= 1001 && passengerCount <= 2500) {
      return 30000; // Rp30.000
    } else if (passengerCount >= 2501 && passengerCount <= 5000) {
      return 25000; // Rp25.000
    } else if (passengerCount >= 5001 && passengerCount <= 10000) {
      return 23000; // Rp23.000
    } else if (passengerCount > 10000) {
      return 20000; // Rp20.000
    }
    return 0; // No commission for 0 passengers
  };

  // Function to get agent's monthly passenger sales
  const getAgentMonthlyPassengerSales = async (
    userId: string,
  ): Promise<number> => {
    try {
      const currentDate = new Date();
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      );

      console.log("🔍 Fetching agent monthly passenger sales:", {
        userId,
        startOfMonth: startOfMonth.toISOString(),
        endOfMonth: endOfMonth.toISOString(),
      });

      // Query handling_bookings for this month to count passengers
      const { data: handlingBookings, error } = await supabase
        .from("handling_bookings")
        .select("passengers")
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

      if (error) {
        console.error("❌ Error fetching agent passenger sales:", error);
        return 0;
      }

      // Sum up all passengers from handling bookings
      const totalPassengers =
        handlingBookings?.reduce((sum, booking) => {
          return sum + (booking.passengers || 0);
        }, 0) || 0;

      console.log("✅ Agent monthly passenger sales:", {
        userId,
        totalBookings: handlingBookings?.length || 0,
        totalPassengers,
      });

      return totalPassengers;
    } catch (error) {
      console.error("❌ Exception in getAgentMonthlyPassengerSales:", error);
      return 0;
    }
  };

  // Function to check if user is an agent and apply commission deduction
  const applyAgentCommissionDeduction = async (
    userId: string,
  ): Promise<{
    isAgent: boolean;
    commissionDeduction: number;
    totalPassengers: number;
  }> => {
    try {
      console.log("🔍 Checking if user is an agent:", userId);

      // Check user's role_id to identify if they are an agent
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role_id, role_name")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        console.log(
          "❌ Error fetching user data or user not found:",
          userError,
        );
        return { isAgent: false, commissionDeduction: 0, totalPassengers: 0 };
      }

      console.log("📋 User data:", {
        userId,
        role_id: userData.role_id,
        role_name: userData.role_name,
      });

      // Check if user is an agent based on role_id or role_name
      // Assuming agents have a specific role_id or role_name that identifies them as agents
      // You may need to adjust this logic based on your specific role structure
      const isAgent =
        userData.role_name?.toLowerCase().includes("agent") ||
        userData.role_id === 5 || // Assuming role_id 5 is for agents
        userData.role_name?.toLowerCase().includes("sales");

      if (!isAgent) {
        console.log("ℹ️ User is not an agent, no commission deduction applied");
        return { isAgent: false, commissionDeduction: 0, totalPassengers: 0 };
      }

      console.log(
        "✅ User identified as agent, calculating commission deduction",
      );

      // Get agent's monthly passenger sales
      const totalPassengers = await getAgentMonthlyPassengerSales(userId);

      // Calculate commission deduction
      const commissionDeduction = calculateAgentCommission(totalPassengers);

      console.log("💰 Agent commission calculation:", {
        userId,
        totalPassengers,
        commissionDeduction: formatCurrency(commissionDeduction),
      });

      return { isAgent: true, commissionDeduction, totalPassengers };
    } catch (error) {
      console.error("❌ Exception in applyAgentCommissionDeduction:", error);
      return { isAgent: false, commissionDeduction: 0, totalPassengers: 0 };
    }
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

    if (selectedPaymentMethod === "paylabs" && !selectedPaylabsMethod) {
      toast({
        title: "Select Paylabs method",
        description: "Please select a Paylabs payment method.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      let paymentId = null;
      let finalTotalAmount = totalAmount;
      let agentCommissionInfo = {
        isAgent: false,
        commissionDeduction: 0,
        totalPassengers: 0,
      };

      console.log("💰 Creating payment for total amount:", totalAmount);
      console.log("🛒 Processing", cartItems.length, "cart items");

      // Use userId as TEXT for the payments table
      let userIdForPayment: string | null = null;
      if (userId) {
        // Convert userId to string for TEXT column
        userIdForPayment = userId.toString();

        // Check if user is an agent and apply commission deduction
        agentCommissionInfo = await applyAgentCommissionDeduction(userId);

        if (
          agentCommissionInfo.isAgent &&
          agentCommissionInfo.commissionDeduction > 0
        ) {
          finalTotalAmount = Math.max(
            0,
            totalAmount - agentCommissionInfo.commissionDeduction,
          );

          console.log("💸 Agent commission deduction applied:", {
            originalAmount: formatCurrency(totalAmount),
            commissionDeduction: formatCurrency(
              agentCommissionInfo.commissionDeduction,
            ),
            finalAmount: formatCurrency(finalTotalAmount),
            totalPassengers: agentCommissionInfo.totalPassengers,
          });

          // Show toast notification about commission deduction
          toast({
            title: "Agent Commission Applied",
            description: `Commission deduction of ${formatCurrency(agentCommissionInfo.commissionDeduction)} applied based on ${agentCommissionInfo.totalPassengers} passengers sold this month.`,
            variant: "default",
          });
        }
      }

      console.log("💰 User ID for payment:", {
        originalUserId: userId,
        userIdForPayment,
        userIdType: typeof userId,
        userIdLength: userId?.length,
        isAgent: agentCommissionInfo.isAgent,
        commissionDeduction: agentCommissionInfo.commissionDeduction,
        finalTotalAmount,
      });

      // Determine payment type based on cart items
      const hasBaggageItems = cartItems.some(
        (item) => item.item_type === "baggage",
      );
      const hasHandlingItems = cartItems.some(
        (item) => item.item_type === "handling",
      );
      const hasRegularItems = cartItems.some(
        (item) => !["baggage", "handling"].includes(item.item_type),
      );

      // Initialize base payment data with final amount after commission deduction
      const paymentData: any = {
        amount: finalTotalAmount,
        payment_method: selectedPaymentMethod,
        status: "pending",
        is_partial_payment: false,
        is_damage_payment: false,
        user_id: userIdForPayment,
        created_at: new Date().toISOString(),
        code_booking: null,
        booking_id: null,
      };

      // Set booking ID and code based on item types
      if (hasRegularItems && !hasBaggageItems && !hasHandlingItems) {
        // Regular bookings only
        const regularBookingId = uuidv4();
        if (!isValidUUID(regularBookingId)) {
          throw new Error(
            "Failed to generate valid UUID for regular booking_id",
          );
        }
        paymentData.booking_id = regularBookingId;
        paymentData.code_booking = `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        console.log(
          "💰 Generated payment for regular booking:",
          regularBookingId,
        );
      } else if (hasBaggageItems && !hasHandlingItems && !hasRegularItems) {
        // Baggage items only - use booking_id from first baggage item if available
        const firstBaggageItem = cartItems.find(
          (item) => item.item_type === "baggage",
        );

        console.log("💰 First baggage item check:", {
          item_booking_id: firstBaggageItem?.booking_id,
          item_code_booking: firstBaggageItem?.code_booking,
          item_booking_id_type: typeof firstBaggageItem?.booking_id,
          item_booking_id_is_uuid: firstBaggageItem?.booking_id
            ? isValidUUID(firstBaggageItem.booking_id)
            : false,
        });

        // CRITICAL FIX: Use booking_id directly from cart item, not from details
        if (
          firstBaggageItem?.booking_id &&
          isValidUUID(firstBaggageItem.booking_id)
        ) {
          paymentData.booking_id = firstBaggageItem.booking_id;
          console.log(
            "💰 Using booking_id from cart item:",
            firstBaggageItem.booking_id,
          );
        } else {
          // Fallback: try to get from details
          let baggageDetails = firstBaggageItem?.details;
          if (typeof baggageDetails === "string") {
            try {
              baggageDetails = JSON.parse(baggageDetails);
            } catch (error) {
              console.error("Error parsing baggage details:", error);
            }
          }

          if (
            baggageDetails?.booking_id &&
            isValidUUID(baggageDetails.booking_id)
          ) {
            paymentData.booking_id = baggageDetails.booking_id;
            console.log(
              "💰 Using booking_id from details:",
              baggageDetails.booking_id,
            );
          }
        }

        // Set code_booking from cart item or details
        if (firstBaggageItem?.code_booking) {
          paymentData.code_booking = firstBaggageItem.code_booking;
          console.log(
            "💰 Using code_booking from cart item:",
            firstBaggageItem.code_booking,
          );
        } else {
          let baggageDetails = firstBaggageItem?.details;
          if (typeof baggageDetails === "string") {
            try {
              baggageDetails = JSON.parse(baggageDetails);
            } catch (error) {
              console.error("Error parsing baggage details:", error);
            }
          }
          if (baggageDetails?.code_booking) {
            paymentData.code_booking = baggageDetails.code_booking;
            console.log(
              "💰 Using code_booking from details:",
              baggageDetails.code_booking,
            );
          }
        }

        console.log("💰 Payment prepared for baggage booking:", {
          booking_id: paymentData.booking_id,
          code_booking: paymentData.code_booking,
        });
      } else if (hasHandlingItems && !hasBaggageItems && !hasRegularItems) {
        // Handling items only - use booking_id from first handling item if available
        const firstHandlingItem = cartItems.find(
          (item) => item.item_type === "handling",
        );
        let handlingDetails = firstHandlingItem?.details;
        if (typeof handlingDetails === "string") {
          try {
            handlingDetails = JSON.parse(handlingDetails);
          } catch (error) {
            console.error("Error parsing handling details:", error);
          }
        }

        if (
          handlingDetails?.booking_id &&
          isValidUUID(handlingDetails.booking_id)
        ) {
          paymentData.booking_id = handlingDetails.booking_id;
        }
        if (
          handlingDetails?.code_booking ||
          handlingDetails?.bookingId ||
          firstHandlingItem?.code_booking
        ) {
          paymentData.code_booking =
            handlingDetails?.code_booking ||
            handlingDetails?.bookingId ||
            firstHandlingItem.code_booking;
        }
        console.log("💰 Payment prepared for handling booking:", {
          booking_id: paymentData.booking_id,
          code_booking: paymentData.code_booking,
        });
      } else {
        // Mixed items - use regular booking approach
        const mixedBookingId = uuidv4();
        if (!isValidUUID(mixedBookingId)) {
          throw new Error("Failed to generate valid UUID for mixed booking_id");
        }
        paymentData.booking_id = mixedBookingId;
        paymentData.code_booking = `MIX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        console.log("💰 Generated payment for mixed booking:", mixedBookingId);
      }

      console.log("💰 Payment data being inserted:", {
        ...paymentData,
        booking_id_type: typeof paymentData.booking_id,
        booking_id_is_uuid: paymentData.booking_id
          ? isValidUUID(paymentData.booking_id)
          : null,
      });

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert(paymentData)
        .select("id")
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
          booking_id: item.booking_id,
          code_booking: item.code_booking,
          booking_id_type: typeof item.booking_id,
          booking_id_is_uuid: item.booking_id
            ? isValidUUID(item.booking_id)
            : false,
        });

        if (item.item_type === "baggage" && item.details) {
          // Use the booking_id from the cart item (which comes from BookingFormBag.tsx)
          let baggageBookingUUID = item.booking_id;

          console.log("💼 Cart item booking_id check:", {
            item_booking_id: item.booking_id,
            item_booking_id_type: typeof item.booking_id,
            item_booking_id_is_uuid: item.booking_id
              ? isValidUUID(item.booking_id)
              : false,
          });

          // If no booking_id in cart item, generate a new one
          if (!baggageBookingUUID || !isValidUUID(baggageBookingUUID)) {
            baggageBookingUUID = uuidv4();
            console.log(
              "💼 Generated new UUID for baggage booking:",
              baggageBookingUUID,
            );
          } else {
            console.log(
              "💼 Using existing UUID from cart item:",
              baggageBookingUUID,
            );
          }

          // Validate the UUID
          if (!isValidUUID(baggageBookingUUID)) {
            console.error(
              "❌ Failed to generate valid UUID for baggage booking:",
              baggageBookingUUID,
            );
            throw new Error(
              "Failed to generate valid UUID for baggage booking",
            );
          }

          // Use the booking code from the cart item (which comes from BookingFormBag.tsx)
          let bookingCode = item.code_booking;

          // If no booking code in cart item, generate a new one
          if (!bookingCode || !isValidBookingCode(bookingCode)) {
            bookingCode = `BG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            console.log("💼 Generated new booking code:", bookingCode);
          } else {
            console.log(
              "💼 Using existing booking code from cart item:",
              bookingCode,
            );
          }

          // Validate the booking code
          if (!isValidBookingCode(bookingCode)) {
            console.error(
              "❌ Generated invalid booking code format:",
              bookingCode,
            );
            throw new Error("Failed to generate valid booking code");
          }

          console.log("💼 Final baggage booking identifiers:", {
            uuid: baggageBookingUUID,
            uuid_valid: isValidUUID(baggageBookingUUID),
            code: bookingCode,
            code_valid: isValidBookingCode(bookingCode),
          });

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

          // Get baggage size from multiple possible sources, but exclude UUIDs
          let baggageSizeValue = null;

          // First try parsedDetails.baggage_size (this should be the primary source)
          if (
            parsedDetails.baggage_size &&
            typeof parsedDetails.baggage_size === "string" &&
            parsedDetails.baggage_size.trim() !== "" &&
            !isValidUUID(parsedDetails.baggage_size)
          ) {
            baggageSizeValue = parsedDetails.baggage_size;
            console.log(
              "[CheckoutPage] Using baggage_size from parsedDetails:",
              baggageSizeValue,
            );
          }
          // Then try item.details?.baggage_size
          else if (
            item.details?.baggage_size &&
            typeof item.details.baggage_size === "string" &&
            item.details.baggage_size.trim() !== "" &&
            !isValidUUID(item.details.baggage_size)
          ) {
            baggageSizeValue = item.details.baggage_size;
            console.log(
              "[CheckoutPage] Using baggage_size from item.details:",
              baggageSizeValue,
            );
          }
          // Only use item_id if it's not a UUID (which it usually is)
          else if (
            item.item_id &&
            typeof item.item_id === "string" &&
            item.item_id.trim() !== "" &&
            !isValidUUID(item.item_id)
          ) {
            baggageSizeValue = item.item_id;
            console.log(
              "[CheckoutPage] Using item_id as baggage_size:",
              baggageSizeValue,
            );
          }

          console.log("[CheckoutPage] Baggage size validation:", {
            parsedDetailsBaggageSize: parsedDetails.baggage_size,
            itemDetailsBaggageSize: item.details?.baggage_size,
            itemId: item.item_id,
            finalBaggageSizeValue: baggageSizeValue,
            serviceName: item.service_name,
          });

          // Determine the final baggage size through validation and fallback logic
          let finalBaggageSize: string = "medium"; // Default fallback

          // Only attempt validation if we have a non-null, non-empty value
          if (
            baggageSizeValue &&
            typeof baggageSizeValue === "string" &&
            baggageSizeValue.trim() !== ""
          ) {
            const validatedSize = validateBaggageSize(baggageSizeValue);
            console.log("[CheckoutPage] Validation result:", {
              input: baggageSizeValue,
              output: validatedSize,
            });

            if (validatedSize) {
              finalBaggageSize = validatedSize;
            }
          } else {
            console.log("[CheckoutPage] No valid baggage size value found:", {
              baggageSizeValue,
              type: typeof baggageSizeValue,
            });
          }

          // If validation failed or no size found, try to extract from service name
          if (finalBaggageSize === "medium" && baggageSizeValue) {
            console.warn(
              "[CheckoutPage] Baggage size validation failed, trying fallback:",
              {
                originalValue: baggageSizeValue,
                serviceName: item.service_name,
                hasServiceName: !!item.service_name,
              },
            );

            // Try to extract size from service name
            if (
              item.service_name &&
              typeof item.service_name === "string" &&
              item.service_name.trim() !== ""
            ) {
              const serviceName = item.service_name.toLowerCase().trim();
              let extractedSize: string | null = null;

              // Check for specific size keywords in order of specificity
              if (
                serviceName.includes("extra large") ||
                serviceName.includes("extra_large")
              ) {
                extractedSize = "extra_large";
              } else if (
                serviceName.includes("large") &&
                !serviceName.includes("extra")
              ) {
                extractedSize = "large";
              } else if (serviceName.includes("medium")) {
                extractedSize = "medium";
              } else if (serviceName.includes("small")) {
                extractedSize = "small";
              } else if (serviceName.includes("electronic")) {
                extractedSize = "electronic";
              } else if (
                serviceName.includes("surfing") ||
                serviceName.includes("surfboard")
              ) {
                extractedSize = "surfingboard";
              } else if (
                serviceName.includes("wheel") ||
                serviceName.includes("chair")
              ) {
                extractedSize = "wheelchair";
              } else if (
                serviceName.includes("golf") ||
                serviceName.includes("stick")
              ) {
                extractedSize = "stickgolf";
              } else if (serviceName.includes("unknown")) {
                // If service name contains "unknown", default to medium
                extractedSize = "medium";
                console.warn(
                  "[CheckoutPage] Service name contains 'unknown', defaulting to medium size",
                );
              }

              // Additional mapping for common size variations
              if (!extractedSize) {
                if (serviceName.includes("stick_golf")) {
                  extractedSize = "stickgolf";
                } else if (serviceName.includes("wheel_chair")) {
                  extractedSize = "wheelchair";
                } else if (serviceName.includes("surfing_board")) {
                  extractedSize = "surfingboard";
                }
              }

              console.log("[CheckoutPage] Fallback size extraction:", {
                serviceName: item.service_name,
                normalizedServiceName: serviceName,
                extractedSize: extractedSize,
              });

              if (extractedSize) {
                console.warn(
                  "[CheckoutPage] Using fallback baggage size:",
                  extractedSize,
                  "from service name:",
                  item.service_name,
                );
                finalBaggageSize = extractedSize;
              }
            } else {
              console.warn(
                "[CheckoutPage] No valid service name available for fallback extraction",
                { serviceName: item.service_name },
              );
            }

            // If still using default medium size after fallback attempt, show toast
            if (finalBaggageSize === "medium" && baggageSizeValue) {
              console.warn(
                "[CheckoutPage] Cannot determine baggage size from any source, defaulting to medium for item:",
                item.service_name,
              );

              toast({
                title: "Baggage size defaulted",
                description: `Baggage item "${item.service_name}" size was set to medium. Please contact support if this is incorrect.`,
                variant: "default",
              });
            }
          }

          // Ensure start_date is never null by providing fallback values
          const startDate =
            parsedDetails.start_date || item.details?.start_date;
          const endDate = parsedDetails.end_date || item.details?.end_date;
          const startTime =
            parsedDetails.start_time || item.details?.start_time || "09:00";

          // If start_date is still null, use current date as fallback
          const finalStartDate =
            startDate || new Date().toISOString().split("T")[0];
          const finalEndDate = endDate || finalStartDate; // Use start date as end date if not provided

          console.log("[CheckoutPage] Baggage booking date validation:", {
            originalStartDate: parsedDetails.start_date,
            itemDetailsStartDate: item.details?.start_date,
            finalStartDate,
            finalEndDate,
            startTime,
          });

          // Extract payment method details based on selected payment type
          let selectedPaymentMethodId = null;
          let paymentMethodDetails = null;

          if (selectedPaymentMethod === "bank_transfer" && selectedBank) {
            selectedPaymentMethodId = selectedBank.id;
            paymentMethodDetails = {
              account_holder: selectedBank.account_holder,
              account_number: selectedBank.account_number,
              bank_name: selectedBank.bank_name || selectedBank.name,
            };
            console.log("🏦 Bank transfer payment method details:", paymentMethodDetails);
          } else if (selectedPaymentMethod === "paylabs" && selectedPaylabsMethod) {
            selectedPaymentMethodId = selectedPaylabsMethod.id;
            paymentMethodDetails = {
              account_holder: selectedPaylabsMethod.account_holder || null,
              account_number: selectedPaylabsMethod.account_number || null,
              bank_name: selectedPaylabsMethod.bank_name || selectedPaylabsMethod.name,
            };
            console.log("💳 Paylabs payment method details:", paymentMethodDetails);
          }

          const bookingData = {
            id: baggageBookingUUID, // Use UUID for primary key
            booking_id: baggageBookingUUID, // UUID for booking_id
            customer_name: customerData.name,
            customer_phone: customerData.phone,
            customer_email: customerData.email,
            flight_number: parsedDetails.flight_number || "-",
            baggage_size: finalBaggageSize,
            item_name: parsedDetails.item_name || null,
            price: item.price,
            duration: parsedDetails.duration || item.details?.duration || 1,
            storage_location:
              parsedDetails.storage_location ||
              item.details?.storage_location ||
              "Terminal 1, Level 1",
            start_date: finalStartDate,
            end_date: finalEndDate,
            start_time: startTime,
            end_time: "",
            airport:
              parsedDetails.airport ||
              item.details?.airport ||
              "Soekarno-Hatta International Airport",
            terminal:
              parsedDetails.terminal || item.details?.terminal || "Terminal 1",
            duration_type:
              parsedDetails.duration_type ||
              item.details?.duration_type ||
              "hours",
            hours: parsedDetails.hours || item.details?.hours || 1,
            status: "confirmed",
            customer_id: userIdForPayment, // UUID for customer_id
            payment_id: paymentId, // UUID from payment insert
           // payment_method: selectedPaymentMethod, // Add payment method
            user_id: userIdForPayment, // UUID for user_id
            booking_date: new Date().toISOString().split('T')[0], // Current date
            quantity: 1, // Default quantity
            total_amount: item.price, // Same as price
            code_booking: item.code_booking || bookingCode, // Text booking code
            created_by_role: "customer", // User role
            notes: parsedDetails.notes || item.details?.notes || null,
            // Payment method details
            payment_method_id: selectedPaymentMethodId,
          //  account_holder: paymentMethodDetails?.account_holder || null,
           // account_number: paymentMethodDetails?.account_number || null,
           // bank_name: paymentMethodDetails?.bank_name || null,
          };

          console.log("💼 Final booking data with booking_id:", {
            id: bookingData.id,
            booking_id: bookingData.booking_id,
            id_equals_booking_id: bookingData.id === bookingData.booking_id,
            payment_id: bookingData.payment_id,
            code_booking: bookingData.code_booking,
          });

          console.log("💼 Inserting baggage booking data:", {
            id: bookingData.id,
            id_type: typeof bookingData.id,
            id_is_uuid: isValidUUID(bookingData.id),
            payment_id: paymentId,
            payment_id_type: typeof paymentId,
            payment_id_is_uuid: isValidUUID(paymentId),
            code_booking: bookingData.code_booking,
            code_booking_type: typeof bookingData.code_booking,
            code_booking_valid: bookingData.code_booking
              ? isValidBookingCode(bookingData.code_booking)
              : null,
            customer_name: bookingData.customer_name,
            baggage_size: bookingData.baggage_size,
            start_date: bookingData.start_date,
            end_date: bookingData.end_date,
          });

          const { data: baggageBooking, error: baggageError } = await supabase
            .from("baggage_booking")
            .insert(bookingData)
            .select()
            .single();

          if (baggageError) {
            console.error("❌ Error saving baggage booking:", {
              error: baggageError,
              error_message: baggageError.message,
              error_details: baggageError.details,
              error_hint: baggageError.hint,
              bookingData: {
                id: bookingData.id,
                payment_id: bookingData.payment_id,
                code_booking: bookingData.code_booking,
                customer_name: bookingData.customer_name,
              },
              paymentId: paymentId,
              validation: {
                id_is_uuid: isValidUUID(bookingData.id),
                payment_id_is_uuid: isValidUUID(paymentId),
                code_booking_valid: bookingData.code_booking
                  ? isValidBookingCode(bookingData.code_booking)
                  : null,
              },
            });

            // Check for specific UUID syntax errors
            if (
              baggageError.message &&
              baggageError.message.includes(
                "invalid input syntax for type uuid",
              )
            ) {
              throw new Error(
                `UUID validation failed for baggage booking. Check payment_id (${paymentId}) is valid UUID.`,
              );
            }

            throw new Error(
              `Failed to save baggage booking: ${baggageError.message}`,
            );
          }

          console.log("✅ Baggage booking created successfully:", {
            id: baggageBooking.id,
            id_type: typeof baggageBooking.id,
            payment_id: baggageBooking.payment_id,
            payment_id_type: typeof baggageBooking.payment_id,
            code_booking: baggageBooking.code_booking,
            code_booking_type: typeof baggageBooking.code_booking,
            customer_name: baggageBooking.customer_name,
          });

          // Send WhatsApp message after successful baggage booking creation
          try {
            console.log("📱 Sending WhatsApp message for baggage booking:", baggageBooking.code_booking);
            await sendBookingWhatsApp(baggageBooking.code_booking);
            console.log("✅ WhatsApp message sent successfully for baggage booking");
          } catch (whatsappError) {
            console.error("❌ Failed to send WhatsApp message:", whatsappError);
            // Don't throw error - continue with checkout process
          }

          // CRITICAL FIX: Only update payment with booking details if payment doesn't already have booking_id
          // This prevents overwriting the booking_id that was set during payment creation
          if (!paymentData.booking_id) {
            console.log("💰 Updating payment with baggage booking details:", {
              paymentId: paymentId,
              baggageBookingId: baggageBooking.id,
              baggageBookingIdType: typeof baggageBooking.id,
              baggageBookingIdIsUUID: isValidUUID(baggageBooking.id),
              codeBooking: baggageBooking.code_booking,
            });

            const { error: updatePaymentError } = await supabase
              .from("payments")
              .update({
                booking_id: baggageBooking.id,
                code_booking: baggageBooking.code_booking,
              })
              .eq("id", paymentId);

            if (updatePaymentError) {
              console.error("❌ Error updating payment with booking details:", {
                error: updatePaymentError,
                paymentId: paymentId,
                baggageBookingId: baggageBooking.id,
                codeBooking: baggageBooking.code_booking,
              });
              throw new Error(
                `Failed to update payment with booking details: ${updatePaymentError.message}`,
              );
            }

            console.log("✅ Payment updated with booking details:", {
              paymentId: paymentId,
              baggageBookingId: baggageBooking.id,
              codeBooking: baggageBooking.code_booking,
            });
          } else {
            console.log("💰 Payment already has booking_id, skipping update:", {
              paymentId: paymentId,
              existingBookingId: paymentData.booking_id,
              baggageBookingId: baggageBooking.id,
            });
          }

          // Link to payment_bookings table
          await linkPaymentBooking(
            paymentId,
            baggageBooking.id.toString(),
            "baggage",
            baggageBooking.code_booking,
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

          // Generate UUID for airport transfer booking (for database primary key)
          const transferBookingUUID = uuidv4();

          // Validate the generated UUID
          if (!isValidUUID(transferBookingUUID)) {
            console.error(
              "❌ Failed to generate valid UUID for airport transfer:",
              transferBookingUUID,
            );
            throw new Error(
              "Failed to generate valid UUID for airport transfer booking",
            );
          }

          // Generate text-based booking code for display/reference
          const transferBookingCode = `AT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          // Validate the generated booking code
          if (!isValidBookingCode(transferBookingCode)) {
            console.error(
              "❌ Generated invalid booking code format:",
              transferBookingCode,
            );
            throw new Error(
              "Failed to generate valid booking code for airport transfer",
            );
          }

          console.log("🚗 Generated airport transfer identifiers:", {
            uuid: transferBookingUUID,
            uuid_valid: isValidUUID(transferBookingUUID),
            code: transferBookingCode,
            code_valid: isValidBookingCode(transferBookingCode),
          });

          // Validate payment_id before creating booking record
          if (!isValidUUID(paymentId)) {
            console.error(
              "❌ Invalid payment_id UUID for airport transfer:",
              paymentId,
            );
            throw new Error(
              "Invalid payment_id UUID for airport transfer booking",
            );
          }

          // Create airport transfer booking
          const transferBookingData = {
            id: transferBookingUUID, // Use UUID for primary key
            booking_id: paymentData.booking_id, // Use UUID from payment for foreign key relationship
            code_booking: transferBookingCode, // Use text-based code for display/reference
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
            customer_id: userIdForPayment, // Use the same user ID as TEXT
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
            console.error("❌ Error creating airport transfer booking:", {
              error: transferError,
              error_message: transferError.message,
              error_details: transferError.details,
              error_hint: transferError.hint,
              validation: {
                id_is_uuid: isValidUUID(transferBookingData.id),
                booking_id_is_uuid: isValidUUID(
                  transferBookingData.booking_id,
                ),
                payment_id_is_uuid: isValidUUID(paymentId),
                code_booking_valid: isValidBookingCode(
                  transferBookingData.code_booking,
                ),
              },
            });

            // Check for specific UUID syntax errors
            if (
              transferError.message &&
              transferError.message.includes(
                "invalid input syntax for type uuid",
              )
            ) {
              throw new Error(
                `UUID validation failed for airport transfer booking. Check booking_id (${transferBookingData.booking_id}) and payment_id (${paymentId}) are valid UUIDs.`,
              );
            }

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
            transferBooking.code_booking,
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
        } else if (item.item_type === "handling" && item.details) {
          // Handle handling service bookings
          let parsedDetails = item.details;
          if (typeof item.details === "string") {
            try {
              parsedDetails = JSON.parse(item.details);
            } catch (error) {
              console.error("Error parsing handling details:", error);
              parsedDetails = item.details;
            }
          }

          console.log("🤝 Processing handling service item:", {
            item_id: item.item_id,
            item_id_type: typeof item.item_id,
            item_id_is_uuid: item.item_id ? isValidUUID(item.item_id) : false,
            parsedDetails: parsedDetails,
            bookingId: parsedDetails?.bookingId || parsedDetails?.booking_id,
          });

          // Check if this is an existing handling booking (has item_id as UUID) or new booking
          if (item.item_id && isValidUUID(item.item_id)) {
            // Update existing handling booking with payment information
            const { data: handlingBookings, error: handlingBookingError } =
              await supabase
                .from("handling_bookings")
                .update({
                  payment_status: "paid",
                  payment_id: paymentId,
                  payment_method: selectedPaymentMethod,
                })
                .eq("id", item.item_id)
                .select();

            if (handlingBookingError) {
              console.error(
                "❌ Error updating handling booking:",
                handlingBookingError,
              );
              // Log the error but continue processing other items
              console.warn(
                `⚠️ Continuing with other items despite handling booking error for ID: ${item.item_id}`,
              );
              continue;
            }

            // Check if any rows were updated
            if (!handlingBookings || handlingBookings.length === 0) {
              console.warn(
                `⚠️ No handling booking found with ID: ${item.item_id}`,
              );
              // Continue processing other items instead of throwing error
              continue;
            }

            const handlingBooking = handlingBookings[0];
            console.log("✅ Handling booking updated:", handlingBooking.id);

            // Send WhatsApp message after successful handling booking update
            try {
              console.log("📱 Sending WhatsApp message for handling booking:", handlingBooking.code_booking);
              await sendHandlingBookingWhatsApp(handlingBooking.code_booking);
              console.log("✅ WhatsApp message sent successfully for handling booking");
            } catch (whatsappError) {
              console.error("❌ Failed to send WhatsApp message:", whatsappError);
              // Don't throw error - continue with checkout process
            }

            // Update payment with booking details if this is a handling-only payment
            if (hasHandlingItems && !hasBaggageItems && !hasRegularItems) {
              const { error: updatePaymentError } = await supabase
                .from("payments")
                .update({
                  booking_id: handlingBooking.id,
                  code_booking: handlingBooking.code_booking,
                })
                .eq("id", paymentId);

              if (updatePaymentError) {
                console.error(
                  "❌ Error updating payment with booking details:",
                  updatePaymentError,
                );
                throw new Error(
                  `Failed to update payment with booking details: ${updatePaymentError.message}`,
                );
              }

              console.log(
                "✅ Payment updated with booking details:",
                handlingBooking.id,
              );
            }

            // Link to payment_bookings table using the SAME booking_id from handling_bookings
            console.log("🔗 Linking payment_bookings with:", {
              payment_id: paymentId,
              booking_id: handlingBooking.id,
              booking_type: "handling",
              code_booking: handlingBooking.code_booking,
            });
            await linkPaymentBooking(
              paymentId,
              handlingBooking.id.toString(),
              "handling",
              handlingBooking.code_booking,
            );
            console.log(
              "✅ Successfully linked payment_bookings with booking_id:",
              handlingBooking.id,
            );
          } else {
            // Create new handling booking
            // Use existing booking_id from cart item details if available, otherwise generate new UUID
            let handlingBookingUUID;
            if (
              parsedDetails?.booking_id &&
              isValidUUID(parsedDetails.booking_id)
            ) {
              handlingBookingUUID = parsedDetails.booking_id;
              console.log(
                "🤝 Using existing booking_id from cart:",
                handlingBookingUUID,
              );
            } else {
              handlingBookingUUID = uuidv4();
              console.log("🤝 Generated new booking_id:", handlingBookingUUID);
            }

            // Validate the UUID
            if (!isValidUUID(handlingBookingUUID)) {
              console.error(
                "❌ Invalid UUID for handling booking:",
                handlingBookingUUID,
              );
              throw new Error("Invalid UUID for handling booking");
            }

            // Use existing booking code from details or generate new one
            const handlingBookingCode =
              parsedDetails?.bookingId ||
              parsedDetails?.code_booking ||
              item.code_booking ||
              `HS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Validate the booking code format
            if (!isValidBookingCode(handlingBookingCode)) {
              console.error(
                "❌ Invalid booking code format:",
                handlingBookingCode,
              );
              throw new Error(
                "Invalid booking code format for handling service",
              );
            }

            console.log("🤝 Handling service identifiers:", {
              uuid: handlingBookingUUID,
              uuid_valid: isValidUUID(handlingBookingUUID),
              code: handlingBookingCode,
              code_valid: isValidBookingCode(handlingBookingCode),
            });

            // Validate payment_id before creating booking record
            if (!isValidUUID(paymentId)) {
              console.error(
                "❌ Invalid payment_id UUID for handling booking:",
                paymentId,
              );
              throw new Error("Invalid payment_id UUID for handling booking");
            }

            // Create handling booking with the SAME booking_id that will be used in payment_bookings
            // STEP 1: Insert with status: "pending" and NO payment_method_id
            const handlingBookingData = {
  id: handlingBookingUUID,
  booking_id: handlingBookingUUID,
  code_booking: handlingBookingCode,
  user_id: userIdForPayment,
  customer_name: customerData.name,
  customer_email: customerData.email,
  customer_phone: customerData.phone,
  travel_type:
    parsedDetails?.travelType ||
    parsedDetails?.travelTypes?.join(", ") ||
    "departure",
  pickup_area: parsedDetails?.pickupArea || "Terminal 1",
  category: parsedDetails?.category || "Individual",
  passenger_area: parsedDetails?.passengerArea,
  flight_number: parsedDetails?.flightNumber,
  passengers: parsedDetails?.passengers || 1,
  pickup_date:
    parsedDetails?.pickupDate ||
    new Date().toISOString().split("T")[0],
  pickup_time: parsedDetails?.pickupTime || "09:00",
  additional_notes: parsedDetails?.additionalNotes || "",
  service_price: parsedDetails?.servicePrice || 0,
  category_price: parsedDetails?.categoryPrice || 0,
  total_price: item.price,
  status: "pending",
 //  payment_method_id: selectedPaymentMethodId,
  payment_id: paymentId,
  created_at: new Date().toISOString(),
};

            console.log(
              "🤝 STEP 1: Creating handling booking with pending status:",
              {
                handlingBookingUUID,
                handlingBookingCode,
                paymentId,
                status: "pending",
                payment_method_id: "NOT_SET",
              },
            );

            const { data: handlingBooking, error: handlingError } =
              await supabase
                .from("handling_bookings")
                .insert(handlingBookingData)
                .select()
                .single();

            if (handlingError) {
              console.error("❌ Error creating handling booking:", {
                error: handlingError,
                error_message: handlingError.message,
                error_details: handlingError.details,
                error_hint: handlingError.hint,
                validation: {
                  id_is_uuid: isValidUUID(handlingBookingData.id),
                  booking_id_is_uuid: isValidUUID(
                    handlingBookingData.booking_id,
                  ),
                  payment_id_is_uuid: isValidUUID(paymentId),
                  code_booking_valid: isValidBookingCode(
                    handlingBookingData.code_booking,
                  ),
                },
              });

              // Check for specific UUID syntax errors
              if (
                handlingError.message &&
                handlingError.message.includes(
                  "invalid input syntax for type uuid",
                )
              ) {
                throw new Error(
                  `UUID validation failed for handling booking. Check booking_id (${handlingBookingData.booking_id}) and payment_id (${paymentId}) are valid UUIDs.`,
                );
              }

              throw new Error(
                `Failed to create handling booking: ${handlingError.message}`,
              );
            }

            console.log("✅ STEP 1: Handling booking created with pending status:", handlingBooking.id);

            // ✅ STEP 2: Update with payment_method_id and status: "confirmed" to trigger bank snapshot
            console.log("🔍 Debug before update:", {
              bookingId: handlingBooking.id,
              paymentMethodId: selectedPaymentMethodId,
              validBookingId: isValidUUID(handlingBooking.id),
              validPaymentMethodId: isValidUUID(selectedPaymentMethodId),
            });

            const { data: updatedHandlingBooking, error: updateError } = await supabase
              .from("handling_bookings")
              .update({
                payment_method_id: selectedPaymentMethodId,
                status: "confirmed",
              })
              .eq("id", handlingBooking.id)
              .select()
              .single();

            console.log("🔍 Update result:", {
              error: updateError,
              updatedData: updatedHandlingBooking,
            });

            if (updateError) {
              console.error("❌ Error updating handling booking with payment details:", {
                error: updateError,
                booking_id: handlingBooking.id,
                payment_method_id: selectedPaymentMethodId
              });
              throw new Error(`Failed to update handling booking with payment details: ${updateError.message}`);
            }

            console.log("✅ STEP 2: Handling booking updated successfully - trigger should fire bank snapshot:", {
              booking_id: updatedHandlingBooking.id,
              status: updatedHandlingBooking.status,
              payment_method_id: updatedHandlingBooking.payment_method_id,
              bank_name: updatedHandlingBooking.bank_name,
              account_holder_received: updatedHandlingBooking.account_holder_received,
              account_number: updatedHandlingBooking.account_number
            });

            // ✅ STEP 3: Update handling_bookings if this is a handling service
            if (item.item_type === "handling" || item.item_type === "handling_group") {
              console.log("🤝 STEP 3: Updating handling booking with payment details:", {
                handling_booking_id: item.details?.handling_booking_id,
                payment_method_id: selectedPaymentMethodId,
                status: "confirmed"
              });

              // Debug before handling booking update
              console.log("🔍 Debug before handling booking update:", {
                handlingBookingId: item.details?.handling_booking_id,
                paymentMethodId: selectedPaymentMethodId,
                validHandlingBookingId: item.details?.handling_booking_id ? isValidUUID(item.details.handling_booking_id) : false,
                validPaymentMethodId: isValidUUID(selectedPaymentMethodId),
              });

              const { data: updatedHandlingBooking, error: handlingUpdateError } = await supabase
                .from("handling_bookings")
                .update({
                  payment_method_id: selectedPaymentMethodId,
                  status: "confirmed",
                })
                .eq("id", item.details?.handling_booking_id)
                .select()
                .single();

              console.log("🔍 Handling booking update result:", {
                error: handlingUpdateError,
                updatedData: updatedHandlingBooking,
              });

              if (handlingUpdateError) {
                console.error("❌ Error updating handling booking with payment details:", {
                  error: handlingUpdateError,
                  handling_booking_id: item.details?.handling_booking_id,
                  payment_method_id: selectedPaymentMethodId
                });
                throw new Error(`Failed to update handling booking with payment details: ${handlingUpdateError.message}`);
              }

              console.log("✅ STEP 3: Handling booking updated successfully - trigger should fire bank snapshot:", {
                booking_id: updatedHandlingBooking.id,
                status: updatedHandlingBooking.status,
                payment_method_id: updatedHandlingBooking.payment_method_id,
                bank_name: updatedHandlingBooking.bank_name,
                account_holder_received: updatedHandlingBooking.account_holder_received,
                account_number: updatedHandlingBooking.account_number
              });
            }
          }
        } else if (item.item_type === "passenger_handling" && item.details) {
          // Handle passenger handling service bookings
          let parsedDetails = item.details;
          if (typeof item.details === "string") {
            try {
              parsedDetails = JSON.parse(item.details);
            } catch (error) {
              console.error("Error parsing passenger handling details:", error);
              parsedDetails = item.details;
            }
          }

          // Generate UUID for passenger handling booking (for database primary key)
          const passengerHandlingUUID = uuidv4();

          // Validate the generated UUID
          if (!isValidUUID(passengerHandlingUUID)) {
            console.error(
              "❌ Failed to generate valid UUID for passenger handling:",
              passengerHandlingUUID,
            );
            throw new Error(
              "Failed to generate valid UUID for passenger handling booking",
            );
          }

          // Generate text-based booking code for display/reference
          const passengerHandlingCode = `PH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          // Validate the generated booking code
          if (!isValidBookingCode(passengerHandlingCode)) {
            console.error(
              "❌ Generated invalid booking code format:",
              passengerHandlingCode,
            );
            throw new Error(
              "Failed to generate valid booking code for passenger handling",
            );
          }

          console.log("👥 Generated passenger handling identifiers:", {
            uuid: passengerHandlingUUID,
            uuid_valid: isValidUUID(passengerHandlingUUID),
            code: passengerHandlingCode,
            code_valid: isValidBookingCode(passengerHandlingCode),
          });

          // Validate payment_id before creating booking record
          if (!isValidUUID(paymentId)) {
            console.error(
              "❌ Invalid payment_id UUID for passenger handling:",
              paymentId,
            );
            throw new Error(
              "Invalid payment_id UUID for passenger handling booking",
            );
          }

          // Create passenger handling booking
          const passengerHandlingData = {
            id: passengerHandlingUUID, // Use UUID for primary key
            booking_id: paymentData.booking_id, // Use UUID from payment for foreign key relationship
            code_booking: passengerHandlingCode, // Use text-based code for display/reference
            customer_name: customerData.name,
            customer_email: customerData.email,
            customer_phone: customerData.phone,
            service_name: parsedDetails?.serviceName || "Passenger Handling",
            location: parsedDetails?.location || "Airport",
            passenger_count: parsedDetails?.passengerCount || 1,
            date: parsedDetails?.date || new Date().toISOString().split("T")[0],
            basic_price: parsedDetails?.basicPrice || 0,
            selling_price: item.price,
            fee_sales: parsedDetails?.feeSales || 0,
            profit: parsedDetails?.profit || 0,
            notes: parsedDetails?.notes || "",
            status: "confirmed",
            customer_id: userIdForPayment,
            payment_id: paymentId,
            created_at: new Date().toISOString(),
          };

          const {
            data: passengerHandlingBooking,
            error: passengerHandlingError,
          } = await supabase
            .from("passenger_handling_bookings")
            .insert(passengerHandlingData)
            .select()
            .single();

          if (passengerHandlingError) {
            console.error("❌ Error creating passenger handling booking:", {
              error: passengerHandlingError,
              error_message: passengerHandlingError.message,
              error_details: passengerHandlingError.details,
              error_hint: passengerHandlingError.hint,
              validation: {
                id_is_uuid: isValidUUID(passengerHandlingData.id),
                booking_id_is_uuid: isValidUUID(
                  passengerHandlingData.booking_id,
                ),
                payment_id_is_uuid: isValidUUID(paymentId),
                code_booking_valid: isValidBookingCode(
                  passengerHandlingData.code_booking,
                ),
              },
            });

            // Check for specific UUID syntax errors
            if (
              passengerHandlingError.message &&
              passengerHandlingError.message.includes(
                "invalid input syntax for type uuid",
              )
            ) {
              throw new Error(
                `UUID validation failed for passenger handling booking. Check booking_id (${passengerHandlingData.booking_id}) and payment_id (${paymentId}) are valid UUIDs.`,
              );
            }

            throw new Error(
              `Failed to create passenger handling booking: ${passengerHandlingError.message}`,
            );
          }

          console.log(
            "✅ Passenger handling booking created:",
            passengerHandlingBooking.id,
          );

          // Link to payment_bookings table
          await linkPaymentBooking(
            paymentId,
            passengerHandlingBooking.id.toString(),
            "passenger_handling",
            passengerHandlingBooking.code_booking,
          );
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

              // Link to payment_bookings table using text-based booking ID
              await linkPaymentBooking(
                paymentId,
                carBooking.id.toString(),
                "car",
                null, // Car bookings don't have code_booking field
              );
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
                customer_id: userIdForPayment, // Use the same user ID as TEXT
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
              await linkPaymentBooking(paymentId, carBooking.id, "car", null);
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
      setSelectedPaylabsMethod(null);

      // Clear sessionStorage
      sessionStorage.removeItem("checkout-customer-data");
      sessionStorage.removeItem("checkout-payment-method");
      sessionStorage.removeItem("checkout-selected-bank");
      sessionStorage.removeItem("checkout-manual-banks");
      sessionStorage.removeItem("checkout-paylabs-methods");
      sessionStorage.removeItem("checkout-selected-paylabs-method");

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
 //   { id: "credit_card", name: "Credit Card", icon: CreditCard },
    { id: "bank_transfer", name: "Bank Transfer", icon: Banknote },
    { id: "cash", name: "Cash", icon: DollarSign },
  //  { id: "paylabs", name: "Paylabs", icon: Smartphone },
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
          sessionStorage.setItem(
            "checkout-customer-data",
            JSON.stringify(newData),
          );
          return newData;
        })
      }
      placeholder="Enter phone number"
      disabled={isAuthenticated && !!customerData.phone_number}
      className={
        isAuthenticated && !!customerData.phone_number
          ? "bg-gray-100 cursor-not-allowed"
          : ""
      }
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
                          {item.item_type === "handling" && "Handling Service"}
                          {item.item_type === "passenger_handling" &&
                            "Passenger Handling"}
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
                            setSelectedPaylabsMethod(null); // Reset selected Paylabs method
                            // Save to sessionStorage
                            sessionStorage.setItem(
                              "checkout-payment-method",
                              method.id,
                            );
                            sessionStorage.removeItem("checkout-selected-bank");
                            sessionStorage.removeItem(
                              "checkout-selected-paylabs-method",
                            );
                            // Immediately fetch payment methods for bank transfer
                            if (method.id === "bank_transfer") {
                              console.log(
                                "🏦 Immediately fetching banks for bank transfer...",
                              );
                              fetchManualPaymentMethods(true);
                            }
                            // Immediately fetch payment methods for Paylabs
                            if (method.id === "paylabs") {
                              console.log(
                                "💳 Immediately fetching methods for Paylabs...",
                              );
                              fetchPaylabsPaymentMethods(true);
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

                  {/* Paylabs Method Selection */}
                  {selectedPaymentMethod === "paylabs" && (
                    <div className="border rounded-lg p-4 mt-4 text-left">
                      <h4 className="font-medium mb-3 text-center">
                        Select Paylabs Payment Method
                      </h4>
                      {isFetchingPaylabs ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Loading Paylabs methods...
                          </p>
                        </div>
                      ) : paylabsMethods.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {paylabsMethods.map((method) => (
                            <div
                              key={method.id}
                              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                                selectedPaylabsMethod?.id === method.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                console.log(
                                  "💳 Paylabs method selected:",
                                  method.name,
                                );
                                setSelectedPaylabsMethod(method);
                                // Save to sessionStorage
                                sessionStorage.setItem(
                                  "checkout-selected-paylabs-method",
                                  JSON.stringify(method),
                                );
                              }}
                            >
                              <div className="font-medium">{method.name}</div>
                              {method.payment_code && (
                                <div className="text-sm text-gray-600">
                                  Code: {method.payment_code}
                                </div>
                              )}
                              {selectedPaylabsMethod?.id === method.id && (
                                <div className="mt-2 text-sm space-y-1">
                                  <div className="text-green-600 font-medium">
                                    ✓ Selected
                                  </div>
                                  {method.mode && (
                                    <div>
                                      <span className="font-medium">Mode:</span>{" "}
                                      <span className="capitalize">
                                        {method.mode}
                                      </span>
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
                            No Paylabs payment methods configured.
                          </p>
                          <p className="text-sm text-gray-400 mb-2">
                            Please contact administrator to configure Paylabs
                            payment methods.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log(
                                "🔄 Retry button clicked, refetching Paylabs methods...",
                              );
                              fetchPaylabsPaymentMethods(true);
                            }}
                            disabled={isFetchingPaylabs}
                          >
                            {isFetchingPaylabs ? (
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
                  (selectedPaymentMethod === "paylabs" &&
                    !selectedPaylabsMethod) ||
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