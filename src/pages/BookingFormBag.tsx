import React, { useState, useEffect, useRef, useCallback } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameDay } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronDown, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

import { useShoppingCart } from "@/hooks/useShoppingCart";

// Create a function to generate the form schema based on selectedSize
const createFormSchema = (selectedSize: string) => {
  return z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z
      .string()
      .min(8, { message: "Phone number must be at least 8 characters" }),
    itemName:
      selectedSize === "electronic"
        ? z
            .string()
            .min(1, { message: "Item name is required for electronic items" })
        : z.string().optional(),
    flightNumber: z.string().optional(),
    airport: z.string({ required_error: "Please select an airport" }),
    terminal: z.string({ required_error: "Please select a terminal" }),
    // Separate fields for Hours mode
    startDate_Hours: z
      .date({ required_error: "Please select a date" })
      .optional(),
    startTime_Hours: z.string().optional(),
    hours: z.number().min(1).max(4).optional(),
    // Separate fields for Days mode
    startDate_Days: z
      .date({ required_error: "Please select a date" })
      .optional(),
    endDate_Days: z.date({ required_error: "Please select a date" }).optional(),
    startTime_Days: z.string().optional(),
  });
};

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface BookingFormProps {
  selectedSize?:
    | "small"
    | "medium"
    | "large"
    | "extra_large"
    | "electronic"
    | "surfingboard"
    | "wheelchair"
    | "stickgolf";
  onComplete?: (data: any) => void;
  onCancel?: () => void;
  baggagePrices?: {
    small: number;
    medium: number;
    large: number;
    extra_large: number;
    electronic: number;
    surfingboard: number;
    wheelchair: number;
    stickgolf: number;
  };
  initialDate?: Date;
  initialTime?: string;
  prefilledData?: {
    name: string;
    email: string;
    phone: string;
  };
}

const BookingForm = ({
  selectedSize = "small",
  onComplete,
  onCancel,
  baggagePrices,
  initialDate,
  initialTime,
  prefilledData,
}: BookingFormProps) => {
  // Safely get shopping cart context with error handling
  const shoppingCartContext = useShoppingCart();
  const {
    addToCart,
    isTabRecentlyActivated,
    isLoading: cartLoading,
  } = shoppingCartContext;

  // Get auth context - render immediately, don't block on session state
  const { isHydrated, isLoading } = useAuth();
  // Safely get auth context with error handling
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.warn("Failed to get auth context in BookingFormBag:", error);
    authContext = {
      isAuthenticated: false,
      userId: null,
      userEmail: null,
      userName: null,
      userPhone: null,
      userRole: null,
      isAdmin: false,
      isLoading: false,
      isHydrated: true,
      isCheckingSession: false,
      signOut: async () => {
        console.warn("signOut called from fallback auth context");
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.warn("Error in fallback signOut:", signOutError);
        }
      },
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

  const { isAuthenticated, userId, userEmail, userName, userPhone } =
    authContext;
  const [step, setStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [durationType, setDurationType] = useState<"hours" | "days">("hours");
  const [selectedAirport, setSelectedAirport] =
    useState<string>("soekarno_hatta");
  const [authStateReady, setAuthStateReady] = useState<boolean>(false);
  const [formJustCleared, setFormJustCleared] = useState<boolean>(false);

  // Generate booking code once and persist it - use a single source of truth
  const [bookingCode, setBookingCode] = useState<string | null>(null);
  const [isBookingCodeInitialized, setIsBookingCodeInitialized] =
    useState(false);

  // Generate a new unique booking code for each order
  const initializeBookingCode = useCallback(() => {
    // Always generate a new booking code for each new order
    // Don't restore from localStorage to ensure uniqueness

    // If already initialized for this session, return existing code
    if (isBookingCodeInitialized && bookingCode) {
      console.log(
        "[BookingForm] Booking code already initialized for this session:",
        bookingCode,
      );
      return bookingCode;
    }

    // Generate new unique booking code matching payment system format: BG-{timestamp}-{random}
    const timestamp = Date.now().toString(); // Full timestamp
    const randomPart = uuidv4().replace(/-/g, "").substring(0, 3).toUpperCase(); // 3 chars for consistency

    const newBookingCode = `BG-${timestamp}-${randomPart}`;

    console.log(
      "[BookingForm] Generated new unique booking code:",
      newBookingCode,
    );
    setBookingCode(newBookingCode);
    setIsBookingCodeInitialized(true);

    // Don't store in localStorage to prevent reuse
    // Each new form instance should get a fresh booking code

    return newBookingCode;
  }, [bookingCode, isBookingCodeInitialized]);

  // Get booking code function that always returns the same code
  const getBookingCode = useCallback(() => {
    if (bookingCode && isBookingCodeInitialized) {
      return bookingCode;
    }
    return initializeBookingCode();
  }, [bookingCode, isBookingCodeInitialized, initializeBookingCode]);

  // Hours mode state
  const [hoursStartDate, setHoursStartDate] = useState<Date | undefined>(
    initialDate || new Date(),
  );
  const [hoursTime, setHoursTime] = useState<string | undefined>(
    initialTime || "",
  );
  const [hourCount, setHourCount] = useState<number>(1);
  const [startDateHoursTouched, setStartDateHoursTouched] =
    useState(!!initialDate);
  const [dateTimeHoursTouched, setDateTimeHoursTouched] =
    useState(!!initialTime);

  // Days mode state
  const [daysStartDate, setDaysStartDate] = useState<Date | undefined>(
    initialDate || new Date(),
  );
  const [daysEndDate, setDaysEndDate] = useState<Date | undefined>(
    initialDate
      ? new Date(new Date(initialDate).setDate(initialDate.getDate() + 1))
      : new Date(new Date().setDate(new Date().getDate() + 1)),
  );
  const [daysPickTime, setDaysPickTime] = useState<string | undefined>(
    initialTime || "",
  );
  const [startDateDaysTouched, setStartDateDaysTouched] =
    useState(!!initialDate);
  const [dateTimeDaysTouched, setDateTimeDaysTouched] = useState(!!initialTime);

  // Function to get current time in HH:MM format
  const getCurrentTimeString = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Available airports
  const airports = [
    { id: "soekarno_hatta", name: "Soekarno Hatta International Airport" },
    { id: "halim_perdanakusuma", name: "Halim Perdanakusuma Airport" },
    { id: "ngurah_rai", name: "Ngurah Rai International Airport" },
    { id: "juanda", name: "Juanda International Airport" },
  ];

  // Available terminals by airport
  const terminalsByAirport = {
    soekarno_hatta: [
      { id: "1A", name: "Terminal 1A" },
      { id: "1B", name: "Terminal 1B" },
      { id: "2D", name: "Terminal 2D" },
      { id: "2E", name: "Terminal 2E" },
      { id: "2F", name: "Terminal 2F" },
      { id: "3_DOMESTIK", name: "Terminal 3 Domestik" },
      { id: "3_INTERNASIONAL", name: "Terminal 3 Internasional" },
    ],
    halim_perdanakusuma: [{ id: "MAIN", name: "Main Terminal" }],
    ngurah_rai: [
      { id: "DOMESTIK", name: "Domestic Terminal" },
      { id: "INTERNASIONAL", name: "International Terminal" },
    ],
    juanda: [
      { id: "T1", name: "Terminal 1" },
      { id: "T2", name: "Terminal 2" },
    ],
  };

  const formSchema = createFormSchema(selectedSize);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange", // 👉 ini penting untuk validasi realtime
    defaultValues: {
      name: prefilledData?.name || userName || "",
      email: prefilledData?.email || userEmail || "",
      phone: prefilledData?.phone || userPhone || "",
      itemName: "",
      flightNumber: "",
      airport: "soekarno_hatta",
      terminal: "3_DOMESTIK",
      startDate_Hours: hoursStartDate,
      startTime_Hours: hoursTime,
      hours: hourCount,
      startDate_Days: daysStartDate,
      endDate_Days: daysEndDate,
      startTime_Days: daysPickTime,
    },
  });

  // Watch form values for Hours mode
  const watchStartDateHours = watch("startDate_Hours");
  const watchStartTimeHours = watch("startTime_Hours");
  const watchHours = watch("hours");

  // Watch form values for Days mode
  const watchStartDateDays = watch("startDate_Days");
  const watchEndDateDays = watch("endDate_Days");
  const watchStartTimeDays = watch("startTime_Days");

  // Separate validation for each duration type
  const isHoursModeValid =
    startDateHoursTouched &&
    !!watchHours &&
    watchHours >= 1 &&
    watchHours <= 4 &&
    !!watchStartTimeHours;

  const isDaysModeValid =
    startDateDaysTouched && !!watchEndDateDays && !!watchStartTimeDays;

  const isDurationStepValid =
    (durationType === "hours" && isHoursModeValid) ||
    (durationType === "days" && isDaysModeValid);

  const getPricePerUnit = () => {
    // Check if baggagePrices prop exists and has the selected size
    if (
      baggagePrices &&
      baggagePrices[selectedSize as keyof typeof baggagePrices]
    ) {
      return baggagePrices[selectedSize as keyof typeof baggagePrices];
    }

    // Default price map that matches database values
    const priceMap = {
      small: 75000,
      medium: 80000,
      large: 90000,
      extra_large: 100000,
      electronic: 90000,
      surfingboard: 100000,
      wheelchair: 60000,
      stickgolf: 120000,
    };

    // Fallback to default price map
    return priceMap[selectedSize] || 75000;
  };

  const calculateTotalPrice = () => {
    const pricePerUnit = getPricePerUnit();

    if (durationType === "hours" && watchHours) {
      return pricePerUnit * Math.ceil(watchHours / 4); // Price per 4 hours
    } else if (
      durationType === "days" &&
      watchStartDateDays &&
      watchEndDateDays
    ) {
      const diffTime = Math.abs(
        watchEndDateDays.getTime() - watchStartDateDays.getTime(),
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return pricePerUnit * diffDays;
    }

    return pricePerUnit; // Default to one unit
  };

  // Helper function to wait for session readiness with enhanced validation
  const waitUntilSessionReady = async () => {
    console.log("[BookingForm] Starting waitUntilSessionReady...");

    // Check if session is already ready with userId validation
    const storedUserId = localStorage.getItem("userId");
    const storedUserEmail = localStorage.getItem("userEmail");

    if (isHydrated && storedUserId && storedUserEmail) {
      console.log("[BookingForm] Session already ready with valid user data");
      return {
        isReady: true,
        userId: storedUserId,
        userEmail: storedUserEmail,
      };
    }

    // Show connecting toast
    const connectingToast = {
      title: "⏳ Menyambungkan sesi...",
      description: "Mohon tunggu sementara kami menyambungkan sesi Anda.",
    };

    // Show toast if available
    try {
      if (typeof toast === "function") {
        toast(connectingToast);
      } else {
        console.log("[BookingForm] Toast not available, showing alert");
        alert(connectingToast.description);
      }
    } catch (toastError) {
      console.warn("[BookingForm] Error showing toast:", toastError);
      alert(connectingToast.description);
    }

    // Wait for session to be ready with enhanced retry mechanism
    let retryCount = 0;
    const maxRetries = 5; // Maximum 5 retries
    const retryDelay = 300; // 300ms delay between retries

    while (retryCount < maxRetries) {
      console.log(
        `[BookingForm] Checking session readiness... (attempt ${retryCount + 1}/${maxRetries})`,
      );

      // Check multiple conditions for session readiness
      const currentStoredUserId = localStorage.getItem("userId");
      const currentStoredUserEmail = localStorage.getItem("userEmail");
      const currentStoredUser = localStorage.getItem("auth_user");

      // Enhanced validation: session ready AND valid user data exists
      if (
        isHydrated &&
        currentStoredUserId &&
        currentStoredUserEmail &&
        currentStoredUser
      ) {
        try {
          const userData = JSON.parse(currentStoredUser);
          if (userData && userData.id && userData.email) {
            console.log(
              "[BookingForm] Session is ready with valid user data:",
              userData.email,
            );
            return {
              isReady: true,
              userId: currentStoredUserId,
              userEmail: currentStoredUserEmail,
              userData: userData,
            };
          }
        } catch (parseError) {
          console.warn(
            "[BookingForm] Error parsing stored user data:",
            parseError,
          );
        }
      }

      // Wait before next retry
      if (retryCount < maxRetries - 1) {
        console.log(
          `[BookingForm] Session not ready, waiting ${retryDelay}ms before retry...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      retryCount++;
    }

    // If session is still not ready after all retries, return failure
    console.error(
      "[BookingForm] Session failed to become ready after all retries",
    );
    alert("Gagal menyambungkan sesi. Silakan refresh halaman dan coba lagi.");

    return { isReady: false };
  };

  // Function to clear form and reset state after successful booking
  const clearFormAfterSuccess = useCallback(() => {
    console.log("[BookingForm] Clearing form after successful booking");

    // Clear localStorage draft - no need to clear booking codes since we don't store them anymore
    localStorage.removeItem("booking_form_draft");

    // Clear any legacy booking codes that might exist from previous versions
    const sizes = [
      "small",
      "medium",
      "large",
      "extra_large",
      "electronic",
      "surfingboard",
      "wheelchair",
      "stickgolf",
    ];
    sizes.forEach((size) => {
      localStorage.removeItem(`booking_code_${size}`);
      localStorage.removeItem(`form_cleared_${size}`);
      localStorage.removeItem(`booking_completed_${size}`);
    });

    // Set multiple flags to prevent any draft restoration
    localStorage.setItem(`form_cleared_${selectedSize}`, Date.now().toString());
    localStorage.setItem(
      `booking_completed_${selectedSize}`,
      Date.now().toString(),
    );
    localStorage.setItem("last_booking_completion", Date.now().toString());
    localStorage.setItem("force_form_reset", Date.now().toString());

    // Reset form state
    reset();
    setStep(0);
    setIsSubmitting(false);

    // Reset booking code state COMPLETELY - this will force generation of new code
    setBookingCode(null);
    setIsBookingCodeInitialized(false);

    // Reset duration type and dates
    setDurationType("hours");
    setHoursStartDate(initialDate || new Date());
    setHoursTime(initialTime || "");
    setHourCount(1);
    setDaysStartDate(initialDate || new Date());
    setDaysEndDate(
      initialDate
        ? new Date(new Date(initialDate).setDate(initialDate.getDate() + 1))
        : new Date(new Date().setDate(new Date().getDate() + 1)),
    );
    setDaysPickTime(initialTime || "");

    // Reset touched states
    setStartDateHoursTouched(!!initialDate);
    setDateTimeHoursTouched(!!initialTime);
    setStartDateDaysTouched(!!initialDate);
    setDateTimeDaysTouched(!!initialTime);

    console.log("[BookingForm] Form cleared and reset to initial state");

    // Dispatch a custom event to notify other components
    window.dispatchEvent(
      new CustomEvent("bookingFormCleared", {
        detail: { selectedSize },
      }),
    );

    // Set flag to prevent immediate draft restoration
    setFormJustCleared(true);

    // Force a longer delay to ensure state updates are processed and prevent draft restoration
    setTimeout(() => {
      console.log("[BookingForm] Form clearing completed with delay");
      setFormJustCleared(false);
      // Remove the cleared flags after 60 seconds
      localStorage.removeItem(`form_cleared_${selectedSize}`);
      localStorage.removeItem(`booking_completed_${selectedSize}`);
      localStorage.removeItem("force_form_reset");
    }, 60000); // 60 seconds to prevent draft restoration
  }, [selectedSize, reset, initialDate, initialTime]);

  const onSubmit = async (data: FormValues) => {
    console.log("[BookingForm] Starting booking submission...");
    console.log("[BookingForm] Auth State:", {
      isAuthenticated,
      userId,
      userEmail,
      userName,
      isHydrated,
    });
    console.log("[BookingForm] Form Data:", data);

    // 🎯 CRITICAL: Enhanced session readiness check with retry mechanism
    const storedUserId = localStorage.getItem("userId");
    const storedUserEmail = localStorage.getItem("userEmail");

    if (!isHydrated || !storedUserId || !storedUserEmail) {
      console.warn(
        "[BookingForm] Session not ready or missing user data, waiting...",
      );

      const sessionResult = await waitUntilSessionReady();

      if (!sessionResult.isReady) {
        console.error(
          "[BookingForm] Failed to establish session readiness after retries",
        );
        alert(
          "❌ Gagal menyambungkan sesi. Silakan refresh halaman dan coba lagi.",
        );
        return; // CRITICAL: Exit early, do not proceed with booking
      }

      console.log(
        "[BookingForm] Session is now ready, proceeding with booking submission",
      );
    }

    // Final validation before proceeding
    const finalUserId = localStorage.getItem("userId");
    const finalUserEmail = localStorage.getItem("userEmail");

    if (!isHydrated || !finalUserId || !finalUserEmail) {
      console.error("[BookingForm] Final session validation failed", {
        isHydrated,
        finalUserId: !!finalUserId,
        finalUserEmail: !!finalUserEmail,
      });
      alert("❌ Sesi tidak siap. Silakan refresh halaman dan coba lagi.");
      return; // CRITICAL: Exit early if session is still not ready
    }

    setIsSubmitting(true);

    try {
      // Simplified session validation with timeout protection
      console.log("[BookingForm] Validating session...");

      let currentUser = null;
      let isAuthValid = false;

      // Simplified session validation - prioritize localStorage
      try {
        // First check localStorage for immediate validation (highest priority)
        const storedUserId = localStorage.getItem("userId");
        const storedUserEmail = localStorage.getItem("userEmail");
        const storedUser = localStorage.getItem("auth_user");

        if (storedUserId && storedUserEmail && storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            currentUser = {
              id: storedUserId,
              email: storedUserEmail,
              name: userData.name || storedUserEmail.split("@")[0] || "User",
            };
            isAuthValid = true;
            console.log(
              "[BookingForm] Using localStorage session data:",
              currentUser.email,
            );
          } catch (parseError) {
            console.warn(
              "[BookingForm] Error parsing stored user:",
              parseError,
            );
          }
        }

        // Only try Supabase if localStorage validation failed (with shorter timeout)
        if (!isAuthValid) {
          console.log(
            "[BookingForm] No localStorage data, trying Supabase (quick check)",
          );
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("Session check timeout")),
              3000, // Reduced timeout to prevent blocking
            );
          });

          const {
            data: { session },
            error,
          } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

          if (!error && session?.user) {
            currentUser = {
              id: session.user.id,
              email: session.user.email || "",
              name:
                session.user.user_metadata?.name ||
                session.user.email?.split("@")[0] ||
                "User",
            };
            isAuthValid = true;
            console.log(
              "[BookingForm] Using Supabase session data:",
              currentUser.email,
            );
          }
        }
      } catch (sessionError) {
        console.log(
          "[BookingForm] Session check failed, using context fallback:",
          sessionError.message,
        );
      }

      // 2. Auth context
      if (!isAuthValid && isAuthenticated && userId && userEmail) {
        currentUser = {
          id: userId,
          email: userEmail,
          name: userName || userEmail.split("@")[0] || "User",
        };
        isAuthValid = true;
        console.log(
          "[BookingForm] Using auth context data:",
          currentUser.email,
        );
      }

      // 3. localStorage fallback
      if (!isAuthValid) {
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id && userData.email) {
              currentUser = {
                id: userData.id,
                email: userData.email,
                name: userData.name || userData.email?.split("@")[0] || "User",
              };
              isAuthValid = true;
              console.log(
                "[BookingForm] Using localStorage data:",
                currentUser.email,
              );
            }
          } catch (e) {
            console.warn("[BookingForm] Error parsing stored user:", e);
          }
        }
      }

      if (!isAuthValid || !currentUser) {
        console.error("[BookingForm] No valid authentication found");
        setIsSubmitting(false); // Reset submitting state
        alert("Sesi login tidak valid. Silakan refresh halaman dan coba lagi.");
        return;
      }

      console.log(
        "[BookingForm] Session validation passed, proceeding with cart addition",
      );

      const calculatedDuration =
        durationType === "days"
          ? data.endDate_Days
            ? Math.ceil(
                (data.endDate_Days.getTime() - data.startDate_Days!.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 1
          : Math.ceil((data.hours || 0) / 4); // 4-jam blok

      const serviceName = `Baggage Storage - ${
        selectedSize === "small"
          ? "Small"
          : selectedSize === "medium"
            ? "Medium"
            : selectedSize === "large"
              ? "Large"
              : selectedSize === "extra_large"
                ? "Extra Large"
                : selectedSize === "electronic"
                  ? "Electronic"
                  : selectedSize === "surfingboard"
                    ? "Surfing Board"
                    : selectedSize === "wheelchair"
                      ? "Wheel Chair"
                      : selectedSize === "stickgolf"
                        ? "Stick Golf"
                        : "Unknown"
      }`;

      const currentBookingCode = getBookingCode(); // Get the persistent booking code

      const cartItem = {
        item_type: "baggage" as "airport_transfer" | "baggage" | "car",
        item_id: selectedSize,
        service_name: serviceName,
        price: calculateTotalPrice(),
        quantity: 1,
        details: {
          customer_name: data.name,
          customer_phone: data.phone,
          customer_email: data.email,
          item_name: selectedSize === "electronic" ? data.itemName || "" : null,
          flight_number: data.flightNumber || "-",
          baggage_size: selectedSize,
          duration: calculatedDuration,
          storage_location:
            localStorage.getItem("baggage_storage_location") ||
            "Terminal 1, Level 1",
          start_date:
            durationType === "hours"
              ? data.startDate_Hours
              : data.startDate_Days,
          end_date:
            durationType === "hours" ? data.startDate_Hours : data.endDate_Days,
          start_time:
            durationType === "hours"
              ? data.startTime_Hours
              : data.startTime_Days,
          airport: data.airport,
          terminal: data.terminal,
          duration_type: durationType,
          hours: durationType === "hours" ? data.hours : null,
          booking_code: currentBookingCode, // Add the persistent booking code to details
        },
      };

      console.log("[BookingForm] Adding item to cart:", {
        item_type: cartItem.item_type,
        service_name: cartItem.service_name,
        price: cartItem.price,
        booking_code: cartItem.details?.booking_code,
        user_authenticated: !!currentUser,
        user_id: currentUser?.id,
      });

      // 🎯 NEW: Check if tab was recently activated before proceeding
      if (isTabRecentlyActivated) {
        console.warn(
          "[BookingForm] Tab recently activated, preventing submission",
        );
        alert("⏳ Menunggu sesi aktif kembali… harap tunggu sebentar.");
        return; // Exit early to prevent submission
      }

      // 🎯 CRITICAL: Enhanced cart readiness check before adding to cart
      console.log("[BookingForm] Checking cart readiness before submission...");

      // Wait for cart to be ready if it's still loading
      if (cartLoading) {
        console.log("[BookingForm] Cart is still loading, waiting...");
        let retryCount = 0;
        const maxRetries = 10;

        while (cartLoading && retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          retryCount++;
          console.log(
            `[BookingForm] Waiting for cart... attempt ${retryCount}/${maxRetries}`,
          );
        }

        if (cartLoading) {
          console.error(
            "[BookingForm] Cart failed to initialize after waiting",
          );
          alert(
            "❌ Sistem keranjang belum siap. Silakan refresh halaman dan coba lagi.",
          );
          return;
        }
      }

      // Validate cart context is properly initialized
      if (!addToCart || typeof addToCart !== "function") {
        console.error("[BookingForm] Cart addToCart function not available");
        alert(
          "❌ Sistem keranjang tidak tersedia. Silakan refresh halaman dan coba lagi.",
        );
        return;
      }

      // 🎯 CRITICAL: Add to cart with proper error handling - DO NOT proceed if failed
      console.log("[BookingForm] Attempting to add item to cart...");
      const cartResult = await addToCart(cartItem);

      if (!cartResult || !cartResult.success) {
        console.error(
          "[BookingForm] Failed to add item to cart:",
          cartResult?.error || "Unknown error",
        );

        // 🎯 CRITICAL: DO NOT call onComplete() or reset form if cart addition failed
        alert(
          cartResult?.error ||
            "❌ Gagal menyimpan booking ke server. Silakan coba ulang.",
        );
        return; // CRITICAL: Exit early - do not proceed with onComplete
      }

      console.log("[BookingForm] Successfully added item to cart");

      console.log("[BookingForm] Calling onComplete callback...");
      if (onComplete) {
        const completionData = {
          name: data.name,
          phone: data.phone,
          email: data.email,
          itemName:
            selectedSize === "electronic" ? data.itemName || "" : undefined,
          flightNumber: data.flightNumber || "-",
          baggageSize: serviceName.replace("Baggage Storage - ", ""),
          price: calculateTotalPrice(),
          duration: calculatedDuration,
          storageLocation:
            localStorage.getItem("baggage_storage_location") ||
            "Terminal 1, Level 1",
          startDate:
            durationType === "hours"
              ? data.startDate_Hours
              : data.startDate_Days,
          endDate:
            durationType === "hours" ? data.startDate_Hours : data.endDate_Days,
          startTime:
            durationType === "hours"
              ? data.startTime_Hours
              : data.startTime_Days,
          endTime: "",
          airport: airports.find((a) => a.id === data.airport)?.name,
          terminal: terminalsByAirport[data.airport]?.find(
            (t) => t.id === data.terminal,
          )?.name,
          durationType: durationType,
          hours: durationType === "hours" ? data.hours : undefined,
          bookingCode: getBookingCode(), // Add persistent booking code
          // Add callback to clear form when modal is closed
          onModalClose: clearFormAfterSuccess,
        };

        console.log("[BookingForm] Completion data:", completionData);
        try {
          onComplete(completionData);
          console.log(
            "[BookingForm] onComplete callback executed successfully",
          );
        } catch (callbackError) {
          console.error(
            "[BookingForm] Error in onComplete callback:",
            callbackError,
          );
        }
      } else {
        console.warn("[BookingForm] No onComplete callback provided");
      }
    } catch (error) {
      console.error("[BookingForm] Error in booking submission:", error);
      alert(
        error.message ||
          "Terjadi kesalahan saat memproses booking. Silakan coba lagi.",
      );
      // 🎯 CRITICAL: DO NOT call onComplete() or reset form when there's an error
      return; // Exit early to prevent onComplete from being called
    } finally {
      console.log("[BookingForm] Cleaning up - resetting state");
      // Always reset submitting state to prevent stuck processing
      setIsSubmitting(false);
      console.log("[BookingForm] Booking submission process completed");
    }
  };

  // Save form draft to localStorage with enhanced data
  const saveFormDraft = () => {
    try {
      const currentBookingCode = getBookingCode(); // Get the current booking code
      const formData = {
        step,
        durationType,
        hoursStartDate,
        hoursTime,
        hourCount,
        daysStartDate,
        daysEndDate,
        daysPickTime,
        selectedSize,
        // Save form values
        formValues: {
          name: watch("name"),
          email: watch("email"),
          phone: watch("phone"),
          itemName: watch("itemName"),
          flightNumber: watch("flightNumber"),
          airport: watch("airport"),
          terminal: watch("terminal"),
        },
        timestamp: Date.now(),
        isSubmitting: false, // Always save as not submitting to prevent stuck state
        // Don't save booking code in draft - each new session should get fresh code
      };
      localStorage.setItem("booking_form_draft", JSON.stringify(formData));
      console.log(
        "[BookingForm] Enhanced form draft saved with step:",
        step,
        "(booking code not saved to ensure uniqueness)",
      );
    } catch (error) {
      console.warn("[BookingForm] Error saving form draft:", error);
    }
  };

  // 2. Auto-restore step dari localStorage jika ditemukan draft valid
  const restoreFormDraft = () => {
    // Don't restore if form was just cleared
    if (formJustCleared) {
      console.log(
        "[BookingForm] Form just cleared, skipping draft restoration",
      );
      return false;
    }

    // Check multiple flags to prevent restoration after successful booking
    const formClearedTimestamp = localStorage.getItem(
      `form_cleared_${selectedSize}`,
    );
    const bookingCompletedTimestamp = localStorage.getItem(
      `booking_completed_${selectedSize}`,
    );
    const lastBookingCompletion = localStorage.getItem(
      "last_booking_completion",
    );
    const forceReset = localStorage.getItem("force_form_reset");

    // CRITICAL: If any reset flag exists, don't restore
    if (
      forceReset ||
      formClearedTimestamp ||
      bookingCompletedTimestamp ||
      lastBookingCompletion
    ) {
      console.log(
        "[BookingForm] Reset flags detected, preventing draft restoration",
      );
      localStorage.removeItem("booking_form_draft");
      return false;
    }

    try {
      const savedDraft = localStorage.getItem("booking_form_draft");
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        const timeDiff = Date.now() - draftData.timestamp;
        const maxAge = 30 * 60 * 1000; // 30 minutes

        if (timeDiff < maxAge && draftData.selectedSize === selectedSize) {
          // CRITICAL: Never restore step 2 drafts - they indicate completed bookings
          if (draftData.step === 2) {
            console.log(
              "[BookingForm] Draft is from completed booking (step 2), clearing and starting fresh",
            );
            localStorage.removeItem("booking_form_draft");
            return false;
          }

          console.log(
            "[BookingForm] Restoring valid form draft with step:",
            draftData.step,
          );

          // Always reset submitting state to prevent stuck button
          setIsSubmitting(false);

          // Restore step and duration type
          setStep(draftData.step || 0);
          setDurationType(draftData.durationType || "hours");

          // Restore dates and times
          if (draftData.hoursStartDate) {
            const restoredDate = new Date(draftData.hoursStartDate);
            setHoursStartDate(restoredDate);
            setValue("startDate_Hours", restoredDate);
            setStartDateHoursTouched(true);
          }

          if (draftData.hoursTime) {
            setHoursTime(draftData.hoursTime);
            setValue("startTime_Hours", draftData.hoursTime);
            setDateTimeHoursTouched(true);
          }

          if (draftData.hourCount) {
            setHourCount(draftData.hourCount);
            setValue("hours", draftData.hourCount);
          }

          if (draftData.daysStartDate) {
            const restoredStartDate = new Date(draftData.daysStartDate);
            setDaysStartDate(restoredStartDate);
            setValue("startDate_Days", restoredStartDate);
            setStartDateDaysTouched(true);
          }

          if (draftData.daysEndDate) {
            const restoredEndDate = new Date(draftData.daysEndDate);
            setDaysEndDate(restoredEndDate);
            setValue("endDate_Days", restoredEndDate);
          }

          if (draftData.daysPickTime) {
            setDaysPickTime(draftData.daysPickTime);
            setValue("startTime_Days", draftData.daysPickTime);
            setDateTimeDaysTouched(true);
          }

          // Restore form values if not prefilled
          if (draftData.formValues && !prefilledData) {
            Object.entries(draftData.formValues).forEach(([key, value]) => {
              if (value) {
                setValue(key as any, value);
              }
            });
          }

          // DON'T restore booking code - always generate new unique one for each order
          console.log(
            "[BookingForm] Not restoring booking code - will generate new unique one",
          );

          console.log(
            "[BookingForm] Form draft restored successfully to step:",
            draftData.step,
          );
          return true;
        } else {
          console.log("[BookingForm] Draft expired or size mismatch, clearing");
          localStorage.removeItem("booking_form_draft");
        }
      }
    } catch (error) {
      console.warn("[BookingForm] Error restoring form draft:", error);
      localStorage.removeItem("booking_form_draft");
    }
    return false;
  };

  // Auto-save form draft when key values change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveFormDraft();
    }, 300); // Reduced debounce time

    return () => clearTimeout(timer);
  }, [
    step,
    durationType,
    hoursStartDate,
    hoursTime,
    hourCount,
    daysStartDate,
    daysEndDate,
    daysPickTime,
    watch("name"),
    watch("email"),
    watch("phone"),
    watch("itemName"),
    watch("flightNumber"),
    watch("airport"),
    watch("terminal"),
  ]);

  const isStepValid = () => {
    if (step === 0) {
      return isValid; // Standard form validation for all users
    }
    if (step === 1) {
      // Validasi berdasarkan mode durasi yang aktif
      if (durationType === "hours") {
        // Validasi khusus untuk mode Hours
        if (watchStartDateHours && watchStartTimeHours && watchHours) {
          const today = new Date();
          const isToday = isSameDay(watchStartDateHours, today);

          if (isToday) {
            // Jika tanggal hari ini, pastikan waktu yang dipilih belum lewat
            const currentHour = today.getHours();
            const currentMinute = today.getMinutes();

            const [selectedHour, selectedMinute] = watchStartTimeHours
              .split(":")
              .map(Number);

            const isTimeValid =
              selectedHour > currentHour ||
              (selectedHour === currentHour && selectedMinute > currentMinute);

            return (
              !!watchHours &&
              watchHours >= 1 &&
              watchHours <= 4 &&
              (isTimeValid || !isToday)
            );
          }

          // Jika bukan hari ini, cukup validasi hours saja
          return (
            !!watchHours &&
            watchHours >= 1 &&
            watchHours <= 4 &&
            !!watchStartTimeHours
          );
        }
        return false;
      } else if (durationType === "days") {
        // Validasi khusus untuk mode Days
        if (watchStartDateDays && watchStartTimeDays && watchEndDateDays) {
          const today = new Date();
          const isToday = isSameDay(watchStartDateDays, today);

          if (isToday) {
            // Jika tanggal hari ini, pastikan waktu yang dipilih belum lewat
            const currentHour = today.getHours();
            const currentMinute = today.getMinutes();

            const [selectedHour, selectedMinute] = watchStartTimeDays
              .split(":")
              .map(Number);

            const isTimeValid =
              selectedHour > currentHour ||
              (selectedHour === currentHour && selectedMinute > currentMinute);

            return !!watchEndDateDays && (isTimeValid || !isToday);
          }

          // Jika bukan hari ini, cukup validasi tanggal akhir saja
          return !!watchEndDateDays;
        }
        return false;
      }
      return false;
    }

    return isValid;
  };

  const steps = [
    {
      title: "Personal Information",
      description: "Enter your contact details",
      content: (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Full Name"
              {...register("name")}
              disabled={!!prefilledData?.name}
              className={prefilledData?.name ? "bg-gray-100" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
            {prefilledData?.name && (
              <p className="text-xs text-gray-500">
                Auto-filled from your profile
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              {...register("email")}
              disabled={!!prefilledData?.email}
              className={prefilledData?.email ? "bg-gray-100" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
            {prefilledData?.email && (
              <p className="text-xs text-gray-500">
                Auto-filled from your profile
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+62 812 3456 7890"
              {...register("phone")}
              disabled={
                !!(
                  prefilledData?.phone ||
                  userPhone ||
                  localStorage.getItem("userPhone")
                )
              }
              className={
                prefilledData?.phone ||
                userPhone ||
                localStorage.getItem("userPhone")
                  ? "bg-gray-100"
                  : ""
              }
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
            {(prefilledData?.phone ||
              userPhone ||
              localStorage.getItem("userPhone")) && (
              <p className="text-xs text-gray-500">
                Auto-filled from your profile
              </p>
            )}
          </div>

          {selectedSize === "electronic" && (
            <div className="grid gap-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                placeholder="e.g., Laptop, Camera, Keyboard"
                {...register("itemName")}
              />
              {errors.itemName && (
                <p className="text-sm text-red-500">
                  {errors.itemName.message}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="flightNumber">Flight Number (Optional)</Label>
            <Input
              id="flightNumber"
              placeholder="GA-123"
              {...register("flightNumber")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="airport">Airport</Label>
            <Select
              defaultValue={watch("airport")}
              onValueChange={(value) => {
                setValue("airport", value);
                setValue(
                  "terminal",
                  terminalsByAirport[
                    value as keyof typeof terminalsByAirport
                  ][0].id,
                );
                setSelectedAirport(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an airport" />
              </SelectTrigger>
              <SelectContent>
                {airports.map((airport) => (
                  <SelectItem key={airport.id} value={airport.id}>
                    {airport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="terminal">Terminal</Label>
            <Select
              defaultValue={watch("terminal")}
              onValueChange={(value) => setValue("terminal", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a terminal" />
              </SelectTrigger>
              <SelectContent>
                {terminalsByAirport[
                  selectedAirport as keyof typeof terminalsByAirport
                ]?.map((terminal) => (
                  <SelectItem key={terminal.id} value={terminal.id}>
                    {terminal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: "Storage Duration",
      description: "Select how long you need storage",
      content: (
        <div className="space-y-4">
          <Tabs
            value={durationType}
            onValueChange={(value) => {
              const newDurationType = value as "hours" | "days";
              setDurationType(newDurationType);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hours">Hours</TabsTrigger>
              <TabsTrigger value="days">Days</TabsTrigger>
            </TabsList>
            <TabsContent value="hours" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="hours">Number of Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  max="4"
                  defaultValue="1"
                  onChange={(e) => {
                    const newHourCount = parseInt(e.target.value);
                    setHourCount(newHourCount);
                    setValue("hours", newHourCount);
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum 1 hour, maximum 4 hours
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Date & Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTimeHoursTouched && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTimeHoursTouched &&
                      watchStartDateHours &&
                      watchStartTimeHours ? (
                        <span>
                          {format(watchStartDateHours, "PPP")} -{" "}
                          {watchStartTimeHours}
                        </span>
                      ) : (
                        <span>Select date time</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <div className="p-3">
                      <Calendar
                        mode="single"
                        selected={watchStartDateHours}
                        onSelect={(date) => {
                          if (date) {
                            setHoursStartDate(date);
                            setValue("startDate_Hours", date);
                            setStartDateHoursTouched(true);
                          }
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                      />
                      <div className="mt-4">
                        <Label htmlFor="startTime_Hours">Pick Time</Label>
                        <div className="flex items-center mt-2">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="startTime_Hours"
                            type="time"
                            className="flex-1"
                            value={watchStartTimeHours || ""}
                            onChange={(e) => {
                              const newTime = e.target.value;
                              setHoursTime(newTime);
                              setValue("startTime_Hours", newTime);
                              setDateTimeHoursTouched(true);
                            }}
                            min={
                              watchStartDateHours &&
                              isSameDay(watchStartDateHours, new Date())
                                ? getCurrentTimeString()
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>

            <TabsContent value="days" className="space-y-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchStartDateDays && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchStartDateDays ? (
                        format(watchStartDateDays, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watchStartDateDays}
                      onSelect={(date) => {
                        if (date) {
                          setDaysStartDate(date);
                          setValue("startDate_Days", date);
                          setStartDateDaysTouched(true);

                          // Always set end date to next day
                          const nextDay = new Date(date);
                          nextDay.setDate(date.getDate() + 1);
                          setDaysEndDate(nextDay);
                          setValue("endDate_Days", nextDay);
                        }
                      }}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="startTime">Pick Time</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime_Days"
                    type="time"
                    className="flex-1"
                    value={watchStartTimeDays || ""}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      setDaysPickTime(newTime);
                      setValue("startTime_Days", newTime);
                      setDateTimeDaysTouched(true);
                    }}
                    min={
                      watchStartDateDays &&
                      isSameDay(watchStartDateDays, new Date())
                        ? getCurrentTimeString()
                        : undefined
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchEndDateDays && "text-muted-foreground",
                      )}
                      disabled={!watchStartDateDays}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchEndDateDays ? (
                        format(watchEndDateDays, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watchEndDateDays}
                      onSelect={(date) => {
                        if (date) {
                          setDaysEndDate(date);
                          setValue("endDate_Days", date);
                        }
                      }}
                      disabled={(date) => {
                        if (!watchStartDateDays) return true;

                        // Disable dates before start date + 1 day
                        const minDate = new Date(watchStartDateDays);
                        minDate.setDate(watchStartDateDays.getDate() + 1);
                        return date < minDate;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ),
    },
    {
      title: "Review & Add to Cart",
      description: "Confirm your booking details",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Baggage Size/Items:</div>
              <div className="font-medium capitalize">{selectedSize}</div>

              <div>Name:</div>
              <div className="font-medium">{watch("name")}</div>

              <div>Email:</div>
              <div className="font-medium">{watch("email")}</div>

              <div>Contact:</div>
              <div className="font-medium">{watch("phone")}</div>

              {selectedSize === "electronic" && watch("itemName") && (
                <>
                  <div>Item Name:</div>
                  <div className="font-medium">{watch("itemName")}</div>
                </>
              )}

              <div>Airport:</div>
              <div className="font-medium">
                {airports.find((a) => a.id === watch("airport"))?.name}
              </div>

              <div>Terminal:</div>
              <div className="font-medium">
                {
                  terminalsByAirport[
                    watch("airport") as keyof typeof terminalsByAirport
                  ]?.find((t) => t.id === watch("terminal"))?.name
                }
              </div>

              {watch("flightNumber") && (
                <>
                  <div>Flight Number:</div>
                  <div className="font-medium">{watch("flightNumber")}</div>
                </>
              )}

              <div>Duration:</div>
              <div className="font-medium">
                {durationType === "hours"
                  ? `${watchHours} hours`
                  : `${
                      watchStartDateDays && watchEndDateDays
                        ? Math.ceil(
                            Math.abs(
                              watchEndDateDays.getTime() -
                                watchStartDateDays.getTime(),
                            ) /
                              (1000 * 60 * 60 * 24),
                          )
                        : 0
                    } days`}
              </div>

              <div>Start Date:</div>
              <div className="font-medium">
                {durationType === "hours"
                  ? format(watchStartDateHours || new Date(), "PPP") +
                    (watchStartTimeHours ? ` - ${watchStartTimeHours}` : "")
                  : format(watchStartDateDays || new Date(), "PPP") +
                    (watchStartTimeDays ? ` - ${watchStartTimeDays}` : "")}
              </div>

              {durationType === "days" && watchEndDateDays && (
                <>
                  <div>End Date:</div>
                  <div className="font-medium">
                    {format(watchEndDateDays, "PPP")}
                  </div>
                </>
              )}

              <div className="col-span-2 text-base font-bold pt-2">
                Total Price:
              </div>
              <div className="col-span-2 text-base font-bold">
                {(() => {
                  const price = calculateTotalPrice();
                  return isNaN(price) || price <= 0
                    ? "Price calculating..."
                    : `Rp ${price.toLocaleString()}`;
                })()}
              </div>

              <div>Booking ID:</div>
              <div className="font-medium font-mono text-blue-600">
                {bookingCode || getBookingCode()}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm text-blue-700">
                This item will be added to your cart. You can select payment
                method and complete checkout from the shopping cart.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Handle tab change to reset fields for the inactive mode
  useEffect(() => {
    if (durationType === "hours") {
      // Update form with current hours mode state
      setValue("startDate_Hours", hoursStartDate);
      setValue("startTime_Hours", hoursTime);
      setValue("hours", hourCount);
    } else {
      // Update form with current days mode state
      setValue("startDate_Days", daysStartDate);
      setValue("endDate_Days", daysEndDate);
      setValue("startTime_Days", daysPickTime);
    }
  }, [
    durationType,
    setValue,
    hoursStartDate,
    hoursTime,
    hourCount,
    daysStartDate,
    daysEndDate,
    daysPickTime,
  ]);

  // Check for booking draft and reset step if needed
  useEffect(() => {
    // Don't restore draft if form was just cleared
    if (formJustCleared) {
      console.log(
        "[BookingForm] Form just cleared, skipping draft restoration in useEffect",
      );
      setStep(0);
      return;
    }

    // Check multiple flags to prevent restoration after successful booking
    const formClearedTimestamp = localStorage.getItem(
      `form_cleared_${selectedSize}`,
    );
    const bookingCompletedTimestamp = localStorage.getItem(
      `booking_completed_${selectedSize}`,
    );
    const lastBookingCompletion = localStorage.getItem(
      "last_booking_completion",
    );
    const forceReset = localStorage.getItem("force_form_reset");

    // CRITICAL: If any reset flag exists, force fresh start
    if (
      forceReset ||
      formClearedTimestamp ||
      bookingCompletedTimestamp ||
      lastBookingCompletion
    ) {
      console.log("[BookingForm] Reset flags detected, forcing fresh start");
      localStorage.removeItem("booking_form_draft");
      setStep(0);
      // Force new booking code generation
      setBookingCode(null);
      setIsBookingCodeInitialized(false);
      initializeBookingCode();
      return;
    }

    const draft = localStorage.getItem("booking_form_draft");
    const parsedDraft = draft ? JSON.parse(draft) : null;

    const isRepeatBooking = parsedDraft?.selectedSize === selectedSize;
    const isFreshStart = !parsedDraft || !isRepeatBooking;

    if (isFreshStart) {
      localStorage.removeItem("booking_form_draft");
      // Initialize booking code for new size if not already done
      if (!isBookingCodeInitialized) {
        initializeBookingCode();
      }
      setStep(0);
    } else {
      // Check if this is a recently completed booking (step 2) - ALWAYS start fresh for step 2
      if (parsedDraft.step === 2) {
        console.log(
          "[BookingForm] Detected draft from completed booking (step 2), starting fresh",
        );
        localStorage.removeItem("booking_form_draft");
        setStep(0);
        // Force new booking code generation
        setBookingCode(null);
        setIsBookingCodeInitialized(false);
        initializeBookingCode();
      } else {
        // Only restore if it's not step 2 and not recently completed
        setStep(parsedDraft.step ?? 0);
        // Don't restore booking code - always generate new unique one for each order
        console.log(
          "[BookingForm] Not restoring booking code from draft - will generate new unique one",
        );
      }
    }
  }, [
    selectedSize,
    isBookingCodeInitialized,
    initializeBookingCode,
    formJustCleared,
  ]);

  // Initialize booking code on component mount - always generate new unique code
  useEffect(() => {
    // Always generate a new unique booking code when component mounts or selectedSize changes
    console.log(
      `[BookingForm] Component mounted or size changed to ${selectedSize}, generating new unique booking code`,
    );

    // Reset booking code state to force new generation
    setBookingCode(null);
    setIsBookingCodeInitialized(false);

    // Generate new unique code
    const code = initializeBookingCode();
    console.log(
      `[BookingForm] Generated new unique booking code for ${selectedSize}:`,
      code,
    );
  }, [selectedSize]); // Only depend on selectedSize to ensure new code for each size selection

  // Function to fetch user profile data from database
  const fetchUserProfile = useCallback(async () => {
    if (!isAuthenticated || !userId) return;

    try {
      console.log("[BookingFormBag] Fetching user profile data for:", userId);

      // Try to get user data from customers table first
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("name, email, phone")
        .eq("user_id", userId)
        .single();

      if (!customerError && customerData) {
        console.log("[BookingFormBag] Found customer data:", customerData);

        // Update form fields if they're empty
        if (customerData.name && !watch("name")) {
          setValue("name", customerData.name);
        }
        if (customerData.email && !watch("email")) {
          setValue("email", customerData.email);
        }
        if (customerData.phone && !watch("phone")) {
          setValue("phone", customerData.phone);
          console.log(
            "[BookingFormBag] Set phone from customer data:",
            customerData.phone,
          );
        }
        return;
      }

      // If no customer data, try users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("name, email, phone")
        .eq("id", userId)
        .single();

      if (!userError && userData) {
        console.log("[BookingFormBag] Found user data:", userData);

        // Update form fields if they're empty
        if (userData.name && !watch("name")) {
          setValue("name", userData.name);
        }
        if (userData.email && !watch("email")) {
          setValue("email", userData.email);
        }
        if (userData.phone && !watch("phone")) {
          setValue("phone", userData.phone);
          console.log(
            "[BookingFormBag] Set phone from user data:",
            userData.phone,
          );
        }
      }
    } catch (error) {
      console.warn("[BookingFormBag] Error fetching user profile:", error);
    }
  }, [isAuthenticated, userId, setValue, watch]);

  // Initialize form data when component mounts
  useEffect(() => {
    if (!isHydrated) {
      console.log("[BookingFormBag] Waiting for hydration...");
      return;
    }

    console.log("[BookingFormBag] Component hydrated, initializing form");

    // Auto-fill form fields from multiple sources with priority order
    const fillFormData = async () => {
      // Priority 1: prefilledData (highest priority)
      if (prefilledData) {
        if (prefilledData.name && !watch("name")) {
          setValue("name", prefilledData.name);
        }
        if (prefilledData.email && !watch("email")) {
          setValue("email", prefilledData.email);
        }
        if (prefilledData.phone && !watch("phone")) {
          setValue("phone", prefilledData.phone);
        }
        return; // If prefilledData exists, use it and return
      }

      // Priority 2: Auth context data
      if (isAuthenticated) {
        console.log("[BookingFormBag] Auto-filling form from auth context:", {
          userName,
          userEmail,
          userPhone,
        });

        if (userName && !watch("name")) {
          setValue("name", userName);
        }
        if (userEmail && !watch("email")) {
          setValue("email", userEmail);
        }
        if (userPhone && !watch("phone")) {
          setValue("phone", userPhone);
        }

        // Priority 3: localStorage fallback
        const storedPhone = localStorage.getItem("userPhone");
        if (!userPhone && storedPhone && !watch("phone")) {
          console.log(
            "[BookingFormBag] Using stored phone from localStorage:",
            storedPhone,
          );
          setValue("phone", storedPhone);
        }

        // Priority 4: Database lookup (lowest priority)
        if (!userPhone && !storedPhone && !watch("phone")) {
          console.log(
            "[BookingFormBag] Phone not found in auth context or localStorage, fetching from database",
          );
          await fetchUserProfile();
        }
      }
    };

    fillFormData();

    // Initialize time fields if initialTime is provided
    if (initialTime) {
      setHoursTime(initialTime);
      setDaysPickTime(initialTime);
      setValue("startTime_Hours", initialTime);
      setValue("startTime_Days", initialTime);
      setDateTimeHoursTouched(true);
      setDateTimeDaysTouched(true);
    }
  }, [
    isHydrated,
    initialTime,
    setValue,
    isAuthenticated,
    userName,
    userEmail,
    userPhone,
    prefilledData,
    watch,
    fetchUserProfile,
  ]);

  // Simplified visibility change handler - let AuthContext handle session restoration
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    let lastVisibilityTime = 0;
    const VISIBILITY_THROTTLE = 30000; // Increased throttle to prevent conflicts

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();

        // Throttle visibility changes to prevent conflicts
        if (now - lastVisibilityTime < VISIBILITY_THROTTLE) {
          console.log("[BookingForm] Visibility change throttled, skipping");
          return;
        }

        lastVisibilityTime = now;
        console.log(
          "[BookingForm] Tab became visible, restoring form state only...",
        );

        // Clear any existing timeout
        if (visibilityTimeout) clearTimeout(visibilityTimeout);

        // Always reset processing state if stuck
        if (isSubmitting) {
          console.log(
            "[BookingForm] Resetting stuck processing state after tab switch",
          );
          setIsSubmitting(false);
        }

        // Let AuthContext handle session restoration, we only restore form state
        visibilityTimeout = setTimeout(() => {
          // Check if form was recently cleared before restoring
          const formClearedTimestamp = localStorage.getItem(
            `form_cleared_${selectedSize}`,
          );
          if (formClearedTimestamp) {
            const timeSinceCleared =
              Date.now() - parseInt(formClearedTimestamp);
            if (timeSinceCleared < 30000) {
              // 30 seconds
              console.log(
                "[BookingForm] Form was recently cleared, skipping auto-restore on visibility change",
              );
              setAuthStateReady(true);
              return;
            }
          }

          console.log(
            "[BookingForm] Auto-restoring form draft to prevent reset",
          );
          restoreFormDraft();
          setAuthStateReady(true); // Assume auth is ready after delay
        }, 5000); // Wait for AuthContext to finish session restoration
      }
    };

    // Listen for auth state refresh events
    const handleAuthStateRefresh = (event: CustomEvent) => {
      console.log("[BookingForm] Auth state refreshed:", event.detail);
      setAuthStateReady(true);

      // Reset processing state if it was stuck
      if (isSubmitting) {
        console.log(
          "[BookingForm] Resetting processing state after auth refresh",
        );
        setIsSubmitting(false);
      }

      // Update form with refreshed user data if prefilled
      if (prefilledData && event.detail) {
        const userData = event.detail;
        if (userData.name && !watch("name")) {
          setValue("name", userData.name);
        }
        if (userData.email && !watch("email")) {
          setValue("email", userData.email);
        }
      }
    };

    // Listen for session restored events
    const handleSessionRestored = (event: CustomEvent) => {
      console.log(
        "[BookingForm] Session restored event received:",
        event.detail,
      );
      setAuthStateReady(true);

      // Reset processing state if it was stuck
      if (isSubmitting) {
        console.log(
          "[BookingForm] Resetting processing state after session restore",
        );
        setIsSubmitting(false);
      }

      // Update form with restored user data - prioritize empty fields
      const userData = event.detail;
      if (userData.name && !prefilledData && !watch("name")) {
        setValue("name", userData.name);
        console.log("[BookingForm] Restored name from session:", userData.name);
      }
      if (userData.email && !prefilledData && !watch("email")) {
        setValue("email", userData.email);
        console.log(
          "[BookingForm] Restored email from session:",
          userData.email,
        );
      }
      if (userData.phone && !prefilledData && !watch("phone")) {
        setValue("phone", userData.phone);
        console.log(
          "[BookingForm] Restored phone from session:",
          userData.phone,
        );
      }

      // Also check localStorage for phone if not in session data
      if (!userData.phone && !prefilledData && !watch("phone")) {
        const storedPhone = localStorage.getItem("userPhone");
        if (storedPhone) {
          setValue("phone", storedPhone);
          console.log(
            "[BookingForm] Restored phone from localStorage:",
            storedPhone,
          );
        }
      }
    };

    // Listen for authStateUpdated event and refresh context
    const refreshContext = () => {
      const storedUser = localStorage.getItem("auth_user");
      if (!isAuthenticated && !storedUser) {
        console.error("[BookingForm] Session expired. Please login again.");
        alert("Session expired. Please login again.");
        window.location.reload();
      } else if (storedUser && !isAuthenticated) {
        // Try to restore from localStorage
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.id && userData.email) {
            console.log("[BookingForm] Restoring session from localStorage");
            window.dispatchEvent(
              new CustomEvent("forceSessionRestore", { detail: userData }),
            );
          }
        } catch (error) {
          console.warn("[BookingForm] Error restoring session:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      "authStateRefreshed",
      handleAuthStateRefresh as EventListener,
    );
    window.addEventListener(
      "sessionRestored",
      handleSessionRestored as EventListener,
    );
    window.addEventListener("authStateUpdated", refreshContext);

    // Initial check and restore on component mount ONLY
    const storedUser = localStorage.getItem("auth_user");
    setAuthStateReady(!!storedUser);

    // Try to restore form draft ONLY on initial load, not on tab switches
    if (storedUser && !authStateReady) {
      console.log(
        "[BookingForm] Initial mount - attempting to restore form draft",
      );
      setTimeout(() => {
        // Check if form was recently cleared before restoring
        const formClearedTimestamp = localStorage.getItem(
          `form_cleared_${selectedSize}`,
        );
        if (formClearedTimestamp) {
          const timeSinceCleared = Date.now() - parseInt(formClearedTimestamp);
          if (timeSinceCleared < 30000) {
            // 30 seconds
            console.log(
              "[BookingForm] Form was recently cleared, skipping initial draft restore",
            );
            return;
          }
        }
        restoreFormDraft();
      }, 100); // Small delay to ensure form is initialized
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "authStateRefreshed",
        handleAuthStateRefresh as EventListener,
      );
      window.removeEventListener(
        "sessionRestored",
        handleSessionRestored as EventListener,
      );
      window.removeEventListener("authStateUpdated", refreshContext);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [
    selectedSize,
    isAuthenticated,
    userId,
    userEmail,
    prefilledData,
    watch,
    setValue,
    isSubmitting,
    authStateReady,
  ]); // Fixed dependencies array

  // Add event listeners for checkout completion and form reset
  useEffect(() => {
    const handleCheckoutCompleted = () => {
      console.log("[BookingForm] Checkout completed, clearing form");
      clearFormAfterSuccess();
    };

    const handleResetBookingForms = () => {
      console.log("[BookingForm] Reset booking forms event received");
      clearFormAfterSuccess();
    };

    const handleCartNavigation = () => {
      console.log("[BookingForm] User navigated back from cart, clearing form");
      clearFormAfterSuccess();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // This fires when user navigates back to the page
      if (event.persisted) {
        console.log(
          "[BookingForm] Page restored from cache, checking if form should be cleared",
        );
        // Check if user came from cart page
        const referrer = document.referrer;
        if (referrer.includes("/cart")) {
          console.log(
            "[BookingForm] User came back from cart page, clearing form",
          );
          clearFormAfterSuccess();
        }
      }
    };

    // Listen for checkout completion
    window.addEventListener("checkoutCompleted", handleCheckoutCompleted);
    window.addEventListener("resetBookingForms", handleResetBookingForms);
    window.addEventListener("cartNavigationBack", handleCartNavigation);
    window.addEventListener("pageshow", handlePageShow as EventListener);

    return () => {
      window.removeEventListener("checkoutCompleted", handleCheckoutCompleted);
      window.removeEventListener("resetBookingForms", handleResetBookingForms);
      window.removeEventListener("cartNavigationBack", handleCartNavigation);
      window.removeEventListener("pageshow", handlePageShow as EventListener);
    };
  }, [clearFormAfterSuccess]);

  return (
    <Card className="w-full max-w-lg mx-auto bg-white">
      <CardHeader>
        <CardTitle>{steps[step].title}</CardTitle>
        <CardDescription>{steps[step].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>{steps[step].content}</form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? onCancel?.() : setStep(step - 1))}
          disabled={isSubmitting}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        <Button
          onClick={async () => {
            if (step === steps.length - 1) {
              console.log("[BookingForm] Book Now button clicked");

              // Prevent multiple submissions
              if (isSubmitting) {
                console.log("[BookingForm] Already submitting, ignoring click");
                return;
              }

              // Add timeout protection for form submission
              const submissionTimeout = setTimeout(() => {
                console.warn(
                  "[BookingForm] Submission timeout, resetting state",
                );
                setIsSubmitting(false);
              }, 15000); // Reduced to 15 seconds for better UX

              try {
                // Submit the form directly
                await handleSubmit(onSubmit)();
                clearTimeout(submissionTimeout);
              } catch (error) {
                console.error("[BookingForm] Form submission error:", error);
                clearTimeout(submissionTimeout);
                setIsSubmitting(false);
              }
            } else {
              console.log(`[BookingForm] Moving to step ${step + 1}`);
              setStep(step + 1);
            }
          }}
          disabled={
            step === steps.length - 1
              ? isSubmitting || isTabRecentlyActivated || cartLoading
              : !isStepValid() ||
                isSubmitting ||
                isTabRecentlyActivated ||
                cartLoading
          }
          className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isTabRecentlyActivated ? (
            "⏳ Menunggu sesi..."
          ) : cartLoading ? (
            "⏳ Menyiapkan keranjang..."
          ) : step === steps.length - 1 ? (
            "Book Now"
          ) : (
            "Next"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookingForm;
