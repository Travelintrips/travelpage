import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  Plane,
  Navigation,
  FileText,
  Globe,
  Users,
  Building,
} from "lucide-react";
import { format } from "date-fns";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";

const HandlingPage = () => {
  const navigate = useNavigate();
  const { addToCart } = useShoppingCart();
  const { toast } = useToast();
  const { userName, userEmail, userPhone, userId, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    passengerArea: "",
    serviceLocation: "",
    category: "",
    pickDate: new Date(),
    pickTime: "09:00",
    passengers: 1, // Only used for Group categories
    flightNumber: "",
    travelTypes: [] as string[], // Changed from single string to array
    pickupArea: "",
    dropoffArea: "", // Added dropoff area field
    additionalNotes: "",
    extraBaggageCount: 0, // New field for Porter service - changed from additionalBaggage
  });

  // Auto-fill form with user data when available
 useEffect(() => {
  if (userName || userEmail || userPhone) {
    setFormData((prev) => ({
      ...prev,
      name: userName || prev.name,
      email: userEmail || prev.email,
      phone_number: userPhone ?? prev.phone_number ?? null, // pakai null jika kosong
    }));

    console.log("[HandlingPage] Auto-filled form with user data:", {
      name: userName || formData.name,
      email: userEmail || formData.email,
      phone_number: userPhone ?? formData.phone_number ?? null,
    });
  }
}, [userName, userEmail, userPhone]);


  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 = menu selection, 2 = category selection, 3 = form, 4 = summary
  const [selectedMenu, setSelectedMenu] = useState("personal"); // personal, porter, umroh
  const [servicePrice, setServicePrice] = useState(0);
  const [categoryPrice, setCategoryPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [bookingId, setBookingId] = useState("");
  const userRole = "Customer"; // atau "Admin", "Staff", dll


  // Generate booking ID with format HS-YYYYMMDD-HHMMSS-XXX
  const generateBookingId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    return `HS-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
  };

  // Location options for Porter service - moved here to be available before getCurrentOptions
  const porterLocationOptions = {
    passengerAreas: [
      "Terminal 2F – International Arrival Hall",
      "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
      "Terminal 2F – International Departure Check-in",
      "Terminal 3 – International Departure (Check-in & Imigrasi)",
      "Terminal 2F – International Transfer Desk",
      "Terminal 3 – International Transfer Area",
      "Terminal 2D – Domestik Arrival Hall",
      "Terminal 2E – Domestik Arrival Hall",
      "Terminal 3 – Domestik Arrival Hall",
      "Terminal 2D – Domestik Departure Check-in",
      "Terminal 2E – Domestik Departure Check-in",
      "Terminal 3 – Domestik Departure Area",
    ],
  };

  // Dynamic location options based on category
  const locationOptions = {
    "International - Individual": {
      passengerAreas: [
        "Terminal 2F – International Arrival Hall",
        "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
        "Terminal 2F – International Departure Check-in",
        "Terminal 3 – International Departure (Check-in & Imigrasi)",
        "Terminal 2F – International Transfer Desk",
        "Terminal 3 – International Transfer Area",
      ],
      pickupAreas: [
        "Terminal 2F – International Arrival Hall",
        "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
        "Terminal 2F – International Departure Check-in",
        "Terminal 3 – International Departure (Check-in & Imigrasi)",
        "Terminal 2F – International Transfer Desk",
        "Terminal 3 – International Transfer Area",
      ],
    },
    "Domestik - Individual": {
      passengerAreas: [
        "Terminal 2D – Domestik Arrival Hall",
        "Terminal 2E – Domestik Arrival Hall",
        "Terminal 3 – Domestik Arrival Hall",
        "Terminal 2D – Domestik Departure Check-in",
        "Terminal 2E – Domestik Departure Check-in",
        "Terminal 3 – Domestik Departure Area",
      ],
      pickupAreas: [
        "Terminal 2D – Domestik Arrival Hall",
        "Terminal 2E – Domestik Arrival Hall",
        "Terminal 3 – Domestik Arrival Hall",
        "Terminal 2D – Domestik Departure Check-in",
        "Terminal 2E – Domestik Departure Check-in",
        "Terminal 3 – Domestik Departure Area",
      ],
    },
    "Handling Group": {
      passengerAreas: [
        "Terminal 2F – International Arrival Hall",
        "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
        "Terminal 2F – International Departure Check-in",
        "Terminal 3 – International Departure (Check-in & Imigrasi)",
        "Terminal 2F – International Transfer Desk",
        "Terminal 3 – International Transfer Area",
        "Terminal 2D – Domestik Arrival Hall",
        "Terminal 2E – Domestik Arrival Hall",
        "Terminal 3 – Domestik Arrival Hall",
        "Terminal 2D – Domestik Departure Check-in",
        "Terminal 2E – Domestik Departure Check-in",
        "Terminal 3 – Domestik Departure Area",
      ],
      pickupAreas: [
        "Terminal 2F – International Arrival Hall",
        "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
        "Terminal 2F – International Departure Check-in",
        "Terminal 3 – International Departure (Check-in & Imigrasi)",
        "Terminal 2F – International Transfer Desk",
        "Terminal 3 – International Transfer Area",
        "Terminal 2D – Domestik Arrival Hall",
        "Terminal 2E – Domestik Arrival Hall",
        "Terminal 3 – Domestik Arrival Hall",
        "Terminal 2D – Domestik Departure Check-in",
        "Terminal 2E – Domestik Departure Check-in",
        "Terminal 3 – Domestik Departure Area",
      ],
    },
  };

  // Get current options based on selected category
  const getCurrentOptions = () => {
    if (!formData.category) {
      return { passengerAreas: [], pickupAreas: [] };
    }

    // Special handling for Porter Service
    if (formData.category === "Porter Service") {
      return {
        passengerAreas: porterLocationOptions.passengerAreas,
        pickupAreas: [],
      };
    }

    return (
      locationOptions[formData.category as keyof typeof locationOptions] || {
        passengerAreas: [],
        pickupAreas: [],
      }
    );
  };

  const currentOptions = getCurrentOptions();

  const travelTypes = [
    { value: "Arrival", label: "Arrival" },
    { value: "Departure", label: "Departure" },
    { value: "Transit", label: "Transit" },
  ];

  const handleTravelTypeChange = (value: string, checked: boolean) => {
    setFormData((prev) => {
      let newTravelTypes;

      if (checked) {
        // If Transit is being selected, clear all other options
        if (value === "Transit") {
          newTravelTypes = ["Transit"];
        }
        // If Arrival or Departure is being selected, remove Transit if it exists
        else if (value === "Arrival" || value === "Departure") {
          newTravelTypes = prev.travelTypes.filter(
            (type) => type !== "Transit",
          );
          newTravelTypes.push(value);
        } else {
          newTravelTypes = [...prev.travelTypes, value];
        }
      } else {
        // If unchecking, just remove the value
        newTravelTypes = prev.travelTypes.filter((type) => type !== value);
      }

      return {
        ...prev,
        travelTypes: newTravelTypes,
      };
    });
  };

  const menuOptions = [
    {
      id: "personal",
      title: "Personal Handling",
      description:
        "Layanan handling perorangan untuk penerbangan domestik dan internasional",
    },
    {
      id: "porter",
      title: "Porter",
      description: "Layanan porter untuk membantu membawa bagasi",
    },
    {
      id: "group",
      title: "Handling Group",
      description:
        "Layanan handling grup untuk penerbangan domestik maupun internasional",
    },
  ];

  const personalHandlingCategories = [
    {
      id: "International - Individual",
      title: "International - Individual",
      icon: <Globe className="h-12 w-12 text-blue-500" />,
      description:
        "Layanan handling untuk penerbangan internasional perorangan",
    },
    {
      id: "Domestik - Individual",
      title: "Domestik - Individual",
      icon: <Building className="h-12 w-12 text-orange-500" />,
      description: "Layanan handling untuk penerbangan domestik perorangan",
    },
  ];

  const porterCategories = [
    {
      id: "Porter Service",
      title: "Porter Service",
      icon: <User className="h-12 w-12 text-purple-500" />,
      description: "Layanan porter untuk membantu membawa bagasi di bandara",
    },
  ];

  const groupCategories = [
    {
      id: "Handling Group",
      title: "Handling Group",
      icon: <Users className="h-12 w-12 text-green-500" />,
      description:
        "Layanan handling grup untuk penerbangan domestik maupun internasional",
    },
  ];

  const timeSlots = [
    "06:00",
    "06:30",
    "07:00",
    "07:30",
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
  ];

  const handleInputChange = (field: string, value: string | Date | number) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value,
      };

      // Reset location fields when category changes
      if (field === "category") {
        newData.passengerArea = "";
        newData.pickupArea = "";
        newData.dropoffArea = "";
      }

      return newData;
    });

    // Fetch prices when category changes
    if (field === "category") {
      fetchPrices(value as string);
    }
  };

  const fetchPrices = async (category: string) => {
    try {
      if (category) {
        // For International - Individual and Domestik - Individual, fetch from database
        if (
          category === "International - Individual" ||
          category === "Domestik - Individual"
        ) {
          // Fetch prices for IDs 1, 29, 32 from airport_handling_services table
          const { data: servicesData, error: servicesError } = await supabase
            .from("airport_handling_services")
            .select("id, trip_type, basic_price, sell_price, additional")
            .in("id", [1, 29, 32]);

          if (servicesError) {
            console.error(
              "Error fetching handling services prices:",
              servicesError,
            );
          } else {
            console.log(
              "Fetched prices from airport_handling_services table:",
              servicesData,
            );

            // Store the fetched data for use in price calculations
            if (servicesData && servicesData.length > 0) {
              // Create a map of service data by ID for easy lookup
              const serviceMap = servicesData.reduce(
                (acc, service) => {
                  acc[service.id] = service;
                  return acc;
                },
                {} as Record<number, any>,
              );

              // Store in component state or calculate based on travel types
              setServicePrice(0); // Will be calculated dynamically
              setCategoryPrice(0);

              // Log individual service prices
              servicesData.forEach((service) => {
                console.log(
                  `Service ID ${service.id} (${service.trip_type}):`,
                  {
                    basic_price: service.basic_price,
                    sell_price: service.sell_price,
                    additional: service.additional,
                  },
                );
              });
            }
          }
        } else {
          // For other categories, use existing logic
          let dbCategory;
          let dbTerminal;

          switch (category) {
            case "Handling Group":
              dbCategory = "Group";
              dbTerminal = "International"; // Default to International for Group
              break;
            default:
              dbCategory = null;
              dbTerminal = null;
          }

          if (dbCategory && dbTerminal) {
            // Fetch base price for other categories
            const { data: categoryData, error: categoryError } = await supabase
              .from("airport_handling_services")
              .select("id, trip_type, basic_price")
              .in("id", [1, 29, 32])
              .limit(1);

            if (categoryError) {
              console.error("Error fetching category price:", categoryError);
            } else {
              const firstResult =
                categoryData && categoryData.length > 0
                  ? categoryData[0]
                  : null;
              setServicePrice(firstResult?.basic_price || 0);
              setCategoryPrice(0);

              console.log("Fetched prices from database:", {
                category: dbCategory,
                terminal: dbTerminal,
                id: firstResult?.id,
                trip_type: firstResult?.trip_type,
                basic_price: firstResult?.basic_price,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  // Function to calculate price for International - Individual based on travel types
  const calculateInternationalIndividualPrice = async () => {
    try {
      let totalPrice = 0;
      const selectedTypes = formData.travelTypes;

      // Fetch prices for selected travel types from airport_handling_services
      const pricePromises = [];

      if (selectedTypes.includes("Arrival")) {
        pricePromises.push(
          supabase
            .from("airport_handling_services")
            .select("id, basic_price, sell_price, additional, trip_type")
            .eq("id", 1)
            .single(),
        );
      }

      if (selectedTypes.includes("Departure")) {
        pricePromises.push(
          supabase
            .from("airport_handling_services")
            .select("id, basic_price, sell_price, additional, trip_type")
            .eq("id", 29)
            .single(),
        );
      }

      if (selectedTypes.includes("Transit")) {
        pricePromises.push(
          supabase
            .from("airport_handling_services")
            .select("id, basic_price, sell_price, additional, trip_type")
            .eq("id", 32)
            .single(),
        );
      }

      // Wait for all price queries to complete
      const results = await Promise.all(pricePromises);

      // Sum up all the basic_price values and log detailed information
      results.forEach((result) => {
        if (result.data && !result.error) {
          const service = result.data;
          totalPrice += service.basic_price || 0;

          console.log(
            `Service ID ${service.id} (${service.trip_type}) prices:`,
            {
              basic_price: service.basic_price,
              sell_price: service.sell_price,
              additional: service.additional,
            },
          );
        }
      });

      setServicePrice(totalPrice);
      setCategoryPrice(0);

      console.log("Calculated International Individual price from database:", {
        selectedTypes,
        totalPrice,
        results: results.map((r) => ({
          data: r.data
            ? {
                id: r.data.id,
                trip_type: r.data.trip_type,
                basic_price: r.data.basic_price,
                sell_price: r.data.sell_price,
                additional: r.data.additional,
              }
            : null,
          error: r.error,
        })),
      });
    } catch (error) {
      console.error("Error calculating International Individual price:", error);
      setServicePrice(0);
    }
  };

  // Calculate price per passenger for Handling Group based on travel types
  const calculateHandlingGroupPrice = () => {
    if (
      formData.category !== "Handling Group" ||
      formData.travelTypes.length === 0
    ) {
      return 0;
    }

    const hasArrival = formData.travelTypes.includes("Arrival");
    const hasDeparture = formData.travelTypes.includes("Departure");
    const hasTransit = formData.travelTypes.includes("Transit");

    // Transit = Rp70,000 per passenger
    if (hasTransit) {
      return 70000;
    }

    // Arrival + Departure = Rp70,000 per passenger
    if (hasArrival && hasDeparture) {
      return 70000;
    }

    // Single service (Arrival OR Departure) = Rp35,000 per passenger
    if (hasArrival || hasDeparture) {
      return 35000;
    }

    return 0;
  };

  // Calculate price for Personal Handling (Individual) based on travel types - now uses database prices
  const calculatePersonalHandlingPrice = async () => {
    if (
      (formData.category !== "International - Individual" &&
        formData.category !== "Domestik - Individual") ||
      formData.travelTypes.length === 0
    ) {
      return 0;
    }

    try {
      let totalPrice = 0;
      const selectedTypes = formData.travelTypes;
      const pricePromises = [];

      // Fetch prices from database based on selected travel types
      if (selectedTypes.includes("Arrival")) {
        pricePromises.push(
          supabase
            .from("airport_handling_services")
            .select("id, basic_price, sell_price, additional, trip_type")
            .eq("id", 1)
            .single(),
        );
      }

      if (selectedTypes.includes("Departure")) {
        pricePromises.push(
          supabase
            .from("airport_handling_services")
            .select("id, basic_price, sell_price, additional, trip_type")
            .eq("id", 29)
            .single(),
        );
      }

      if (selectedTypes.includes("Transit")) {
        pricePromises.push(
          supabase
            .from("airport_handling_services")
            .select("id, basic_price, sell_price, additional, trip_type")
            .eq("id", 32)
            .single(),
        );
      }

      // Wait for all price queries to complete
      const results = await Promise.all(pricePromises);

      // Sum up all the basic_price values
      results.forEach((result) => {
        if (result.data && !result.error) {
          const service = result.data;
          totalPrice += service.basic_price || 0;

          console.log(
            `Personal Handling - Service ID ${service.id} (${service.trip_type}) prices:`,
            {
              basic_price: service.basic_price,
              sell_price: service.sell_price,
              additional: service.additional,
            },
          );
        }
      });

      console.log("Personal Handling total price from database:", {
        selectedTypes,
        totalPrice,
        category: formData.category,
      });

      return totalPrice;
    } catch (error) {
      console.error(
        "Error calculating Personal Handling price from database:",
        error,
      );
      return 0;
    }
  };

  // Calculate Porter Service price
  const calculatePorterServicePrice = () => {
    if (formData.category !== "Porter Service") {
      return 0;
    }

    const basePrice = 70000;
    const extraBaggagePrice = formData.extraBaggageCount * 10000;
    return basePrice + extraBaggagePrice;
  };

  // Calculate total price whenever service price, category price, or passengers change
  useEffect(() => {
    const updatePrices = async () => {
      if (formData.category === "Handling Group") {
        // For Handling Group: use custom price calculation
        const pricePerPassenger = calculateHandlingGroupPrice();
        const totalGroupPrice = pricePerPassenger * formData.passengers;
        setTotalPrice(totalGroupPrice);
        setServicePrice(pricePerPassenger); // Set service price to price per passenger for display
      } else if (
        formData.category === "International - Individual" ||
        formData.category === "Domestik - Individual"
      ) {
        // For Personal Handling: use database price calculation
        const personalPrice = await calculatePersonalHandlingPrice();
        setTotalPrice(personalPrice);
        setServicePrice(personalPrice);
      } else if (formData.category === "Porter Service") {
        // For Porter Service: use custom price calculation
        const porterPrice = calculatePorterServicePrice();
        setTotalPrice(porterPrice);
        setServicePrice(porterPrice);
      } else {
        // For other services: just the sell_price
        setTotalPrice(servicePrice);
      }
    };

    updatePrices();
  }, [
    servicePrice,
    categoryPrice,
    formData.passengers,
    formData.category,
    formData.travelTypes,
    formData.extraBaggageCount,
  ]);

  // Recalculate price when travel types change for International - Individual
  useEffect(() => {
    if (
      formData.category === "International - Individual" &&
      formData.travelTypes.length > 0
    ) {
      calculateInternationalIndividualPrice();
    }
  }, [formData.travelTypes, formData.category]);

  const handleBookNow = async () => {
    setIsLoading(true);

    try {
      // Generate booking ID if not already generated
      const currentBookingId = bookingId || generateBookingId();
      if (!bookingId) {
        setBookingId(currentBookingId);
      }

      // Generate UUID for booking_id
      const bookingUUID = crypto.randomUUID();

      // First, insert the handling booking into the handling_bookings table
      const { data: handlingBooking, error: handlingError } = await supabase
        .from("handling_bookings")
        .insert({
          user_id: userId, // Add user_id from AuthContext
          booking_id: bookingUUID, // UUID for booking_id column
          code_booking: currentBookingId, // Text-based booking code for code_booking column
          customer_name: formData.name,
          company_name: formData.companyName || null,
          customer_email: formData.email,
          customer_phone: formData.phone,
          passenger_area: formData.passengerArea,
          category: formData.category,
          // Only include passengers for Group categories
          ...(formData.category === "Handling Group" && {
            passengers: formData.passengers,
          }),
          pickup_date: format(formData.pickDate, "yyyy-MM-dd"),
          pickup_time: formData.pickTime,
          flight_number: formData.flightNumber,
          travel_type: formData.travelTypes.join(", "), // Join array to string
          pickup_area: formData.pickupArea,
          dropoff_area: formData.dropoffArea,
          additional_notes: formData.additionalNotes,
          extra_baggage_count:
            formData.category === "Porter Service"
              ? formData.extraBaggageCount
              : null,
          service_price: servicePrice,
          category_price: categoryPrice,
          total_amount: totalPrice || 150000,
          total_price: totalPrice || 150000,
          status: "pending",
        })
        .select()
        .single();

      if (handlingError) {
        console.error("Error inserting handling booking:", handlingError);
        throw new Error("Failed to create handling booking");
      }

      console.log("Handling booking created:", handlingBooking);

      // Then add to shopping cart with reference to the handling booking
      await addToCart({
        item_type: "handling",
        item_id: handlingBooking.id, // Use the handling booking UUID as item_id
        booking_id: bookingUUID, // UUID for booking_id field in shopping_cart
        code_booking: currentBookingId, // Text-based booking code for code_booking field
        service_name: `Handling Service - ${formData.passengerArea}`,
        price: totalPrice || 150000, // Use calculated total price or fallback
        quantity: 1,
        details: {
          bookingId: currentBookingId, // Text-based booking code for display
          booking_id: bookingUUID, // UUID for compatibility with checkout processing
          code_booking: currentBookingId, // Text-based booking code for payment processing
          handling_booking_id: handlingBooking.id, // Reference to the handling booking record
          customerName: formData.name,
          companyName: formData.companyName,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          passengerArea: formData.passengerArea,
          category: formData.category,
          // Only include passengers for Group categories
          ...(formData.category === "Handling Group" && {
            passengers: formData.passengers,
          }),
          pickupDate: format(formData.pickDate, "yyyy-MM-dd"),
          pickupTime: formData.pickTime,
          flightNumber: formData.flightNumber,
          travelTypes: formData.travelTypes,
          travelType: formData.travelTypes.join(", "), // Add single field for compatibility
          pickupArea: formData.pickupArea,
          dropoffArea: formData.dropoffArea,
          additionalNotes: formData.additionalNotes,
          extraBaggageCount:
            formData.category === "Porter Service"
              ? formData.extraBaggageCount
              : null,
          serviceType: "handling",
          servicePrice: servicePrice,
          categoryPrice: categoryPrice,
          totalPrice: totalPrice,
        },
      });

      toast({
        title: "Berhasil ditambahkan",
        description: "Layanan handling telah ditambahkan ke keranjang belanja.",
      });

      // Navigate to cart or back to travel page
      navigate("/cart");
    } catch (error) {
      console.error("Error adding handling service to cart:", error);
      toast({
        title: "Gagal menambahkan",
        description: "Terjadi kesalahan saat menambahkan layanan ke keranjang.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      navigate("/");
    }
  };

  const handleContinueToCategory = () => {
    // Get categories based on selected menu
    const categories =
      selectedMenu === "personal"
        ? personalHandlingCategories
        : selectedMenu === "porter"
          ? porterCategories
          : groupCategories;

    // If there's only one category, auto-select it and skip to form
    if (categories.length === 1) {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }
      handleInputChange("category", categories[0].id);
      setCurrentStep(3); // Skip category selection, go directly to form
    } else {
      setCurrentStep(2); // Go to category selection
    }
  };

  const handleContinueToForm = () => {
    if (!formData.category) {
      toast({
        title: "Pilih kategori",
        description: "Mohon pilih kategori layanan terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(3);
  };

  const handleContinueToSummary = () => {
    // Different validation for Porter Service
    if (formData.category === "Porter Service") {
      // Validate form for Porter Service
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.passengerArea ||
        !formData.category
      ) {
        toast({
          title: "Form tidak lengkap",
          description: "Mohon lengkapi semua field yang diperlukan.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Dynamic validation based on travel types for other services
      const needsPickupArea =
        formData.travelTypes.includes("Arrival") ||
        formData.travelTypes.includes("Transit");
      const needsDropoffArea =
        formData.travelTypes.includes("Departure") ||
        formData.travelTypes.includes("Transit");

      // Validate form for other services
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.passengerArea ||
        !formData.category ||
        !formData.flightNumber ||
        formData.travelTypes.length === 0 ||
        (needsPickupArea && !formData.pickupArea) ||
        (needsDropoffArea && !formData.dropoffArea)
      ) {
        toast({
          title: "Form tidak lengkap",
          description:
            "Mohon lengkapi semua field yang diperlukan dan pilih minimal satu jenis perjalanan.",
          variant: "destructive",
        });
        return;
      }
    }
    setCurrentStep(4);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 p-0 h-auto text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home Page
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Layanan Handling Bandara
          </h1>
          <p className="text-gray-600">
            Pesan layanan handling untuk memudahkan perjalanan Anda di bandara
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2 md:space-x-4">
            <div
              className={`flex items-center space-x-2 ${currentStep >= 1 ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                1
              </div>
              <span className="text-xs md:text-sm font-medium">Pilih Menu</span>
            </div>
            <div
              className={`w-4 md:w-8 h-0.5 ${currentStep >= 2 ? "bg-green-600" : "bg-gray-200"}`}
            ></div>
            <div
              className={`flex items-center space-x-2 ${currentStep >= 2 ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                2
              </div>
              <span className="text-xs md:text-sm font-medium">
                Pilih Kategori
              </span>
            </div>
            <div
              className={`w-4 md:w-8 h-0.5 ${currentStep >= 3 ? "bg-green-600" : "bg-gray-200"}`}
            ></div>
            <div
              className={`flex items-center space-x-2 ${currentStep >= 3 ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 3
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                3
              </div>
              <span className="text-xs md:text-sm font-medium">
                Informasi Pemesanan
              </span>
            </div>
            <div
              className={`w-4 md:w-8 h-0.5 ${currentStep >= 4 ? "bg-green-600" : "bg-gray-200"}`}
            ></div>
            <div
              className={`flex items-center space-x-2 ${currentStep >= 4 ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 4
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                4
              </div>
              <span className="text-xs md:text-sm font-medium">
                Ringkasan Pesanan
              </span>
            </div>
          </div>
        </div>

        {/* Menu Selection Card */}
        {currentStep === 1 && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Pilih Menu Layanan Handling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs
                value={selectedMenu}
                onValueChange={setSelectedMenu}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal">Personal Handling</TabsTrigger>
                  <TabsTrigger value="porter">Porter</TabsTrigger>
                  <TabsTrigger value="group">Handling Group</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="mt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Personal Handling
                    </h3>
                    <p className="text-gray-600">
                      Layanan handling perorangan untuk penerbangan domestik dan
                      internasional
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="porter" className="mt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Porter
                    </h3>
                    <p className="text-gray-600">
                      Layanan porter untuk membantu membawa bagasi
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="group" className="mt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Handling Group
                    </h3>
                    <p className="text-gray-600">
                      Layanan handling grup untuk penerbangan domestik maupun
                      internasional
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Kembali
                </Button>
                <Button
                  onClick={handleContinueToCategory}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Lanjutkan ke Kategori
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Selection Card */}
        {currentStep === 2 && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Pilih Kategori Layanan -{" "}
                {selectedMenu === "personal"
                  ? "Personal Handling"
                  : selectedMenu === "porter"
                    ? "Porter"
                    : "Handling Group"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div
                  className={`grid gap-6 ${
                    selectedMenu === "personal"
                      ? "grid-cols-1 md:grid-cols-2 max-w-2xl"
                      : "grid-cols-1 max-w-md"
                  }`}
                >
                  {(selectedMenu === "personal"
                    ? personalHandlingCategories
                    : selectedMenu === "porter"
                      ? porterCategories
                      : groupCategories
                  ).map((category) => (
                    <Card
                      key={category.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        formData.category === category.id
                          ? "border-2 border-green-500 shadow-md"
                          : "border border-gray-200"
                      }`}
                      onClick={() => {
                        if (!isAuthenticated) {
                          setShowAuthModal(true);
                          return;
                        }
                        handleInputChange("category", category.id);
                      }}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <div
                          className={`p-4 rounded-full mb-4 ${
                            formData.category === category.id
                              ? "bg-green-100"
                              : "bg-gray-100"
                          }`}
                        >
                          {category.icon}
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-center">
                          {category.title}
                        </h3>
                        <p className="text-gray-500 text-center text-sm mb-4">
                          {category.description}
                        </p>
                        <Button
                          variant={
                            formData.category === category.id
                              ? "default"
                              : "outline"
                          }
                          className={`w-full ${
                            formData.category === category.id
                              ? "bg-green-600 hover:bg-green-700"
                              : "border-green-600 text-green-600 hover:bg-green-50"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isAuthenticated) {
                              setShowAuthModal(true);
                              return;
                            }
                            handleInputChange("category", category.id);
                          }}
                        >
                          {formData.category === category.id
                            ? "Selected"
                            : "Select"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Selected Category Display */}
              {formData.category && (
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <User className="h-4 w-4 mr-2 text-green-600" />
                    Kategori Terpilih
                  </label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="font-medium text-green-800">
                      {formData.category}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Kembali
                </Button>
                <Button
                  onClick={handleContinueToForm}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Lanjutkan ke Form
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Card */}
        {currentStep === 3 && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Informasi Pemesanan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <User className="h-4 w-4 mr-2 text-green-600" />
                  Nama Lengkap
                </label>
                <Input
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Company Name Field */}
             { userRole !== "Customer" && (
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <User className="h-4 w-4 mr-2 text-green-600" />
                  Nama Perusahaan
                </label>
                <Input
                  type="text"
                  placeholder="Masukkan nama perusahaan (opsional)"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  className="w-full"
                />
              </div>
             )}

              {/* Email Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4 mr-2 text-green-600" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Masukkan alamat email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Phone className="h-4 w-4 mr-2 text-green-600" />
                  No. Telepon
                </label>
                <Input
                  type="tel"
                  placeholder="Masukkan nomor telepon"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Passenger Area Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <MapPin className="h-4 w-4 mr-2 text-green-600" />
                  Area Lokasi Penumpang
                </label>
                <Select
                  value={formData.passengerArea}
                  onValueChange={(value) =>
                    handleInputChange("passengerArea", value)
                  }
                  disabled={!formData.category}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        formData.category
                          ? "Pilih area lokasi penumpang"
                          : "Pilih kategori terlebih dahulu"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {currentOptions.passengerAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Extra Baggage Count Field - Only show for Porter Service */}
              {formData.category === "Porter Service" && (
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <User className="h-4 w-4 mr-2 text-green-600" />
                    Baggasi Tambahan
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Masukkan jumlah baggasi tambahan"
                    value={formData.extraBaggageCount.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      if (value >= 0) {
                        handleInputChange("extraBaggageCount", value);
                      }
                    }}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Minimal 0 baggasi tambahan
                  </p>

                  {/* Porter Service Price Calculation Display */}
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">
                      Kalkulasi Harga Porter Service
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-purple-700">Harga Dasar:</span>
                        <span className="font-medium text-purple-800">
                          Rp 70.000
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">
                          Bagasi Tambahan ({formData.extraBaggageCount} × Rp
                          10.000):
                        </span>
                        <span className="font-medium text-purple-800">
                          Rp{" "}
                          {(
                            formData.extraBaggageCount * 10000
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-purple-200 pt-2 mt-2">
                        <div className="flex justify-between font-semibold text-purple-800">
                          <span>Total Harga:</span>
                          <span>
                            Rp{" "}
                            {(
                              70000 +
                              formData.extraBaggageCount * 10000
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Flight Number Field - Hide for Porter Service */}
              {formData.category !== "Porter Service" && (
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Plane className="h-4 w-4 mr-2 text-green-600" />
                    Nomor Penerbangan
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: GA123, SJ182"
                    value={formData.flightNumber}
                    onChange={(e) =>
                      handleInputChange("flightNumber", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
              )}

              {/* Travel Type Field - Hide for Porter Service */}
              {formData.category !== "Porter Service" && (
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Navigation className="h-4 w-4 mr-2 text-green-600" />
                    Jenis Perjalanan
                  </label>
                  <div className="flex flex-col space-y-2">
                    {travelTypes.map((type) => {
                      // Determine if this checkbox should be disabled
                      const isDisabled =
                        (type.value === "Transit" &&
                          (formData.travelTypes.includes("Arrival") ||
                            formData.travelTypes.includes("Departure"))) ||
                        ((type.value === "Arrival" ||
                          type.value === "Departure") &&
                          formData.travelTypes.includes("Transit"));

                      return (
                        <div
                          key={type.value}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            id={type.value}
                            checked={formData.travelTypes.includes(type.value)}
                            disabled={isDisabled}
                            onChange={(e) =>
                              handleTravelTypeChange(
                                type.value,
                                e.target.checked,
                              )
                            }
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label
                            htmlFor={type.value}
                            className={`text-sm font-medium leading-none ${
                              isDisabled
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-gray-900 cursor-pointer"
                            }`}
                          >
                            {type.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Location Fields based on Travel Types - Hide for Porter Service */}
              {formData.category !== "Porter Service" && (
                <>
                  {/* Pickup Area Field - Show for Arrival or Transit */}
                  {(formData.travelTypes.includes("Arrival") ||
                    formData.travelTypes.includes("Transit")) && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <MapPin className="h-4 w-4 mr-2 text-green-600" />
                        Lokasi Jemput
                      </label>
                      <Select
                        value={formData.pickupArea}
                        onValueChange={(value) =>
                          handleInputChange("pickupArea", value)
                        }
                        disabled={!formData.category}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              formData.category
                                ? "Pilih lokasi jemput"
                                : "Pilih kategori terlebih dahulu"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {currentOptions.pickupAreas.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Dropoff Area Field - Show for Departure or Transit */}
                  {(formData.travelTypes.includes("Departure") ||
                    formData.travelTypes.includes("Transit")) && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <MapPin className="h-4 w-4 mr-2 text-green-600" />
                        Lokasi Antar
                      </label>
                      <Select
                        value={formData.dropoffArea}
                        onValueChange={(value) =>
                          handleInputChange("dropoffArea", value)
                        }
                        disabled={!formData.category}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              formData.category
                                ? "Pilih lokasi antar"
                                : "Pilih kategori terlebih dahulu"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {currentOptions.pickupAreas.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* Additional Notes Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <FileText className="h-4 w-4 mr-2 text-green-600" />
                  Catatan Lokasi Tambahan
                </label>
                <Textarea
                  placeholder="Masukkan catatan tambahan mengenai lokasi jemput (opsional)"
                  value={formData.additionalNotes}
                  onChange={(e) =>
                    handleInputChange("additionalNotes", e.target.value)
                  }
                  className="w-full min-h-[80px]"
                />
              </div>

              {/* Date and Time Fields for Individual categories */}
              {(formData.category === "International - Individual" ||
                formData.category === "Domestik - Individual") && (
                <>
                  {/* Pickup Date Field */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <CalendarIcon className="h-4 w-4 mr-2 text-green-600" />
                      Tanggal Pickup
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.pickDate ? (
                            format(formData.pickDate, "PPP")
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.pickDate}
                          onSelect={(date) =>
                            date && handleInputChange("pickDate", date)
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Pickup Time Field */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Clock className="h-4 w-4 mr-2 text-green-600" />
                      Waktu Pickup
                    </label>
                    <Select
                      value={formData.pickTime}
                      onValueChange={(value) =>
                        handleInputChange("pickTime", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih waktu pickup" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Passenger Field - Only show for Group categories */}
              {formData.category === "Handling Group" && (
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <User className="h-4 w-4 mr-2 text-green-600" />
                    Jumlah Penumpang
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Masukkan jumlah penumpang"
                    value={formData.passengers.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      if (value >= 1) {
                        handleInputChange("passengers", value);
                      }
                    }}
                    className="w-full"
                  />

                  {/* Price Calculation Display for Handling Group */}
                  {formData.travelTypes.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Kalkulasi Harga
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">
                            Jenis Perjalanan:
                          </span>
                          <span className="font-medium text-blue-800">
                            {formData.travelTypes.join(", ")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">
                            Harga per Penumpang:
                          </span>
                          <span className="font-medium text-blue-800">
                            Rp {calculateHandlingGroupPrice().toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">
                            Jumlah Penumpang:
                          </span>
                          <span className="font-medium text-blue-800">
                            {formData.passengers} orang
                          </span>
                        </div>
                        <div className="border-t border-blue-200 pt-2 mt-2">
                          <div className="flex justify-between font-semibold text-blue-800">
                            <span>Total Harga:</span>
                            <span>
                              Rp{" "}
                              {(
                                calculateHandlingGroupPrice() *
                                formData.passengers
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Price Calculation Display for Personal Handling */}
              {(formData.category === "International - Individual" ||
                formData.category === "Domestik - Individual") &&
                formData.travelTypes.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">
                      Kalkulasi Harga Personal Handling
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Jenis Perjalanan:
                        </span>
                        <span className="font-medium text-green-800">
                          {formData.travelTypes.join(", ")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Kategori:</span>
                        <span className="font-medium text-green-800">
                          {formData.category}
                        </span>
                      </div>
                      <div className="border-t border-green-200 pt-2 mt-2">
                        <div className="flex justify-between font-semibold text-green-800">
                          <span>Total Harga:</span>
                          <span>Rp {totalPrice.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-green-600">
                        <p>• Arrival atau Departure: Rp 40.000</p>
                        <p>• Arrival + Departure atau Transit: Rp 80.000</p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Date and Time Fields for Group categories */}
              {formData.category === "Handling Group" && (
                <>
                  {/* Pickup Date Field */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <CalendarIcon className="h-4 w-4 mr-2 text-green-600" />
                      Tanggal Pickup
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.pickDate ? (
                            format(formData.pickDate, "PPP")
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.pickDate}
                          onSelect={(date) =>
                            date && handleInputChange("pickDate", date)
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Pickup Time Field */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Clock className="h-4 w-4 mr-2 text-green-600" />
                      Waktu Pickup
                    </label>
                    <Select
                      value={formData.pickTime}
                      onValueChange={(value) =>
                        handleInputChange("pickTime", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih waktu pickup" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Kembali
                </Button>
                <Button
                  onClick={handleContinueToSummary}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Lanjutkan ke Ringkasan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {currentStep === 4 && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Ringkasan Pesanan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Detail Layanan
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Layanan:</span>
                    <span className="font-medium">Handling Service</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Area Lokasi Penumpang:
                    </span>
                    <span className="font-medium">
                      {formData.passengerArea}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kategori:</span>
                    <span className="font-medium">{formData.category}</span>
                  </div>
                  {formData.category === "Handling Group" && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Jumlah Penumpang:</span>
                      <span className="font-medium">
                        {formData.passengers} Penumpang
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tanggal:</span>
                    <span className="font-medium">
                      {format(formData.pickDate, "dd MMMM yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Waktu:</span>
                    <span className="font-medium">{formData.pickTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nomor Penerbangan:</span>
                    <span className="font-medium">{formData.flightNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jenis Perjalanan:</span>
                    <span className="font-medium">
                      {formData.travelTypes.join(", ")}
                    </span>
                  </div>
                  {formData.pickupArea && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lokasi Jemput:</span>
                      <span className="font-medium">{formData.pickupArea}</span>
                    </div>
                  )}
                  {formData.dropoffArea && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lokasi Antar:</span>
                      <span className="font-medium">
                        {formData.dropoffArea}
                      </span>
                    </div>
                  )}
                  {formData.additionalNotes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Catatan Tambahan:</span>
                      <span className="font-medium">
                        {formData.additionalNotes}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Detail Pelanggan
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama:</span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  {formData.companyName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Perusahaan:</span>
                      <span className="font-medium">
                        {formData.companyName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telepon:</span>
                    <span className="font-medium">{formData.phone}</span>
                  </div>
                </div>
              </div>

              {/* Booking ID */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-3">Booking ID</h3>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">ID Booking:</span>
                    <span className="font-medium text-blue-800 font-mono">
                      {bookingId || generateBookingId()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Details */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3">
                  Detail Harga
                </h3>
                <div className="space-y-2 text-sm">
                  {formData.category === "Handling Group" ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Jenis Perjalanan:
                        </span>
                        <span className="font-medium text-green-800">
                          {formData.travelTypes.join(", ") || "Belum dipilih"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Harga per Penumpang:
                        </span>
                        <span className="font-medium text-green-800">
                          Rp {calculateHandlingGroupPrice().toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Jumlah Penumpang:
                        </span>
                        <span className="font-medium text-green-800">
                          {formData.passengers} orang
                        </span>
                      </div>
                    </>
                  ) : formData.category === "International - Individual" ||
                    formData.category === "Domestik - Individual" ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Jenis Perjalanan:
                        </span>
                        <span className="font-medium text-green-800">
                          {formData.travelTypes.join(", ") || "Belum dipilih"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Kategori:</span>
                        <span className="font-medium text-green-800">
                          {formData.category}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Harga Personal Handling:
                        </span>
                        <span className="font-medium text-green-800">
                          Rp {totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : formData.category === "Porter Service" ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-green-700">Harga Dasar:</span>
                        <span className="font-medium text-green-800">
                          Rp 70.000
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Bagasi Tambahan ({formData.extraBaggageCount} × Rp
                          10.000):
                        </span>
                        <span className="font-medium text-green-800">
                          Rp{" "}
                          {(
                            formData.extraBaggageCount * 10000
                          ).toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {servicePrice > 0 && (
                        <div className="flex justify-between">
                          <span className="text-green-700">
                            Harga Dasar ({formData.category}):
                          </span>
                          <span className="font-medium text-green-800">
                            Rp {servicePrice.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {totalPrice === 0 && (
                        <div className="flex justify-between">
                          <span className="text-green-700">
                            Layanan Handling:
                          </span>
                          <span className="font-medium text-green-800">
                            Rp 150.000
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t border-green-200 pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-green-800">
                      <span>Total:</span>
                      <span>Rp {(totalPrice || 150000).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Kembali ke Form
                </Button>
                <Button
                  onClick={handleBookNow}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? "Memproses..." : "Book Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Info */}
        <Card className="mt-6 bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-green-800 mb-2">
              Tentang Layanan Handling
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Bantuan check-in dan boarding pass</li>
              <li>• Pendampingan di area keberangkatan</li>
              <li>• Bantuan bagasi dan dokumen perjalanan</li>
              <li>• Layanan prioritas di counter bandara</li>
              <li>• Harga bervariasi berdasarkan lokasi dan kategori</li>
            </ul>
          </CardContent>
        </Card>

        {/* Auth Required Modal */}
        <AuthRequiredModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="Authentication Required"
          message="Please Sign in or Register to access"
        />
      </div>
    </div>
  );
};

export default HandlingPage;
