import { LoadScriptNext } from "@react-google-maps/api";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";
import { v4 as uuidv4 } from "uuid";

// Google Maps libraries array - defined outside component to prevent re-creation on every render
const GOOGLE_MAPS_LIBRARIES: "places"[] = ["places"];

// Memoize the Google Maps API key to prevent unnecessary re-renders
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// UI Components
import { ArrowRightCircle, UserCheck, CarFront } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// Custom Components
import AddressSearch from "@/components/AddressSearch";
import MapPicker from "@/components/MapPicker";

// Icons
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  ArrowRightLeft,
  Loader2,
  MapPin,
  Car,
  CheckCircle,
  Phone,
  Home,
  ChevronRight,
} from "lucide-react";

async function geocodeAddress(
  address: string,
): Promise<[number, number] | null> {
  if (!address || address.trim() === "") return null;

  const MAPBOX_ACCESS_TOKEN =
    "pk.eyJ1IjoidHJhdmVsaW50cmlwcyIsImEiOiJjbWNib2VqaWwwNzZoMmtvNmYxd3htbTFhIn0.9rFe8T88zhYh--wZDSumsQ";

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`,
    );
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return [lat, lng];
    }
  } catch (err) {
    console.error("Mapbox geocoding failed:", err);
  }
  return null;
}

// Types
interface BookingFormData {
  fromLocation: [number, number];
  toLocation: [number, number];
  fromAddress: string;
  toAddress: string;
  pickupDate: string;
  pickupTime: string;
  passenger: number;
  vehicleType: string;
  fullName: string;
  phoneNumber: string;
  paymentMethod: string;
  price: number;
  distance: number;
  duration: number;
  codeBooking: string;
  driverId: string | null;
  driverName: string;
  driverPhone: string;
  driverPhoto: string;
  vehicleName: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleColor: string;
  vehicleMake: string;
  vehiclePricePerKm: number;
  basicPrice: number;
  surcharge: number;
}

interface Driver {
  id: string;
  id_driver?: number | null;
  driver_name: string;
  phone_number: string;
  status: string;
  photo_url?: string;
  vehicle_name?: string;
  vehicle_model?: string;
  license_plate?: string;
  vehicle_color?: string;
  vehicle_make?: string;
  vehicle_type?: string;
  price_km?: number;
  basic_price?: number;
  surcharge?: number;
  distance?: number;
  eta?: number;
}

function AirportTransferPageContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    userId,
    userName,
    userEmail,
    isAuthenticated,
    isLoading,
    isHydrated,
    isSessionReady,
  } = useAuth();

  const { addToCart } = useShoppingCart();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Step tracking
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;
  const progressPercentage = (currentStep / totalSteps) * 100;

  // Form data
  const [formData, setFormData] = useState<BookingFormData>({
    fromLocation: [-6.2, 106.8], // Jakarta default
    toLocation: [-6.2, 106.8],
    fromAddress: "",
    toAddress: "",
    pickupDate: "",
    pickupTime: "10:00",
    passenger: 1,
    vehicleType: "MPV",
    fullName: userName || "",
    phoneNumber: "",
    paymentMethod: "cash",
    price: 0,
    distance: 0,
    duration: 0,
    codeBooking: generateCodeBooking(),
    driverId: null,
    driverName: "",
    driverPhone: "",
    driverPhoto: "",
    vehicleName: "",
    vehicleModel: "",
    vehiclePlate: "",
    vehicleColor: "",
    vehicleMake: "",
    vehiclePricePerKm: 0,
    basicPrice: 0,
    surcharge: 0,
  });

  // State for available vehicles and drivers for instant booking
  const [availableVehiclesWithDrivers, setAvailableVehiclesWithDrivers] =
    useState<
      {
        id: string;
        uuid: string | null; // ✅ Driver UUID from drivers.id
        id_driver: number | null; // ✅ Driver integer ID from drivers.id_driver
        make: string;
        model: string;
        license_plate: string;
        driver_name: string;
        driver_phone: string;
        vehicle_type: string;
        price_km: number;
        basic_price: number;
        surcharge: number;
        image: string | null;
      }[]
    >([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState<boolean>(false);

  // State to track if both pickup and dropoff locations are selected
  const [locationsSelected, setLocationsSelected] = useState<boolean>(false);

  // State to track if route has been calculated to prevent recalculation
  // This fixes the pricing inconsistency issue where distance would change between steps
  const [routeCalculated, setRouteCalculated] = useState<boolean>(false);

  // Fetch available vehicles with drivers for instant booking
  const fetchAvailableVehiclesWithDrivers = async (vehicleType: string) => {
    if (!vehicleType) return;

    setIsLoadingVehicles(true);
    try {
      console.log(`🔍 Fetching vehicles for type: ${vehicleType}`);

      // Try multiple approaches to find vehicles for the selected type
      // Approach 1: Direct type matching
      let { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select(
          `
          id,
          make,
          model,
          license_plate,
          type,
          price_km,
          basic_price,
          surcharge,
          image,
          drivers!vehicles_driver_id_fkey (
            id,
            id_driver,
            name,
            phone_number
          )
        `,
        )
        .eq("type", vehicleType)
        .not("driver_id", "is", null)
        .eq("is_active", true);

      // If no results with direct type matching, try vehicle_type_id approach
      if ((!vehiclesData || vehiclesData.length === 0) && !vehiclesError) {
        console.log(
          `🔄 No direct matches for ${vehicleType}, trying vehicle_type_id approach`,
        );

        // Get the vehicle_type_id from vehicle_types table
        const { data: vehicleTypeData, error: vehicleTypeError } =
          await supabase
            .from("vehicle_types")
            .select("id")
            .eq("name", vehicleType)
            .maybeSingle();

        if (!vehicleTypeError && vehicleTypeData) {
          const { data: vehiclesData2, error: vehiclesError2 } = await supabase
            .from("vehicles")
            .select(
              `
              id,
              make,
              model,
              license_plate,
              type,
              price_km,
              basic_price,
              surcharge,
              image,
              drivers!vehicles_driver_id_fkey (
                id,
                id_driver,
                name,
                phone_number
              )
            `,
            )
            .eq("vehicle_type_id", vehicleTypeData.id)
            .not("driver_id", "is", null)
            .eq("is_active", true);

          if (!vehiclesError2) {
            vehiclesData = vehiclesData2;
            vehiclesError = vehiclesError2;
          }
        }
      }

      // If still no results, try case-insensitive matching
      if ((!vehiclesData || vehiclesData.length === 0) && !vehiclesError) {
        console.log(
          `🔄 No matches found, trying case-insensitive search for ${vehicleType}`,
        );

        const { data: vehiclesData3, error: vehiclesError3 } = await supabase
          .from("vehicles")
          .select(
            `
            id,
            make,
            model,
            license_plate,
            type,
            price_km,
            basic_price,
            surcharge,
            image,
            drivers!vehicles_driver_id_fkey (
              id,
              id_driver,
              name,
              phone_number
            )
          `,
          )
          .ilike("type", `%${vehicleType}%`)
          .not("driver_id", "is", null)
          .eq("is_active", true);

        if (!vehiclesError3) {
          vehiclesData = vehiclesData3;
          vehiclesError = vehiclesError3;
        }
      }

      if (vehiclesError) {
        console.error("Error fetching vehicles with drivers:", vehiclesError);
        setAvailableVehiclesWithDrivers([]);
        return;
      }

      // Format the data
      const formattedVehicles =
        vehiclesData
          ?.filter((vehicle) => vehicle.drivers) // Ensure driver data exists
          .map((vehicle) => ({
            id: vehicle.id, // Vehicle ID
            uuid: vehicle.drivers?.id || null, // ✅ Driver UUID from drivers.id
            id_driver: vehicle.drivers?.id_driver || null, // ✅ Driver integer ID from drivers.id_driver
            make: vehicle.make,
            model: vehicle.model,
            license_plate: vehicle.license_plate || "N/A",
            driver_name: vehicle.drivers?.name || "Unknown Driver",
            driver_phone: vehicle.drivers?.phone_number || "N/A",
            vehicle_type: vehicle.type || vehicleType,
            price_km: Number(vehicle.price_km) || 3250,
            basic_price: Number(vehicle.basic_price) || 75000,
            surcharge: Number(vehicle.surcharge) || 40000,
            image: vehicle.image || null,
          })) || [];

      setAvailableVehiclesWithDrivers(formattedVehicles);
      console.log(
        `✅ Found ${formattedVehicles.length} available vehicles with drivers for ${vehicleType}:`,
        formattedVehicles.map(
          (v) =>
            `${v.make} ${v.model} (${v.vehicle_type}) - Driver: ${v.driver_name}`,
        ),
      );

      // Debug: Log all available vehicle types in database
      if (formattedVehicles.length === 0) {
        console.log(
          `⚠️ No vehicles found for ${vehicleType}. Checking what vehicle types exist in database...`,
        );

        const { data: allVehicles } = await supabase
          .from("vehicles")
          .select("type, make, model")
          .not("driver_id", "is", null)
          .eq("is_active", true);

        console.log(`📊 All available vehicle types in database:`, [
          ...new Set(allVehicles?.map((v) => v.type) || []),
        ]);

        console.log(
          `📊 All vehicles in database:`,
          allVehicles?.map((v) => `${v.make} ${v.model} (${v.type})`) || [],
        );
      }
    } catch (error) {
      console.error("Error in fetchAvailableVehiclesWithDrivers:", error);
      setAvailableVehiclesWithDrivers([]);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  // Auth state synchronization for AirportTransfer
  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent) => {
      console.log("[AirportTransfer] Auth state changed:", event.detail);

      if (event.detail?.loggedOut) {
        console.log(
          "[AirportTransfer] User logged out, clearing transfer data",
        );
        // Reset form data and states
        setFormData((prev) => ({
          ...prev,
          fullName: "",
          phoneNumber: "",
          driverId: null,
          driverName: "",
          driverPhone: "",
        }));
        setSelectedDriver(null);
        setSelectedVehicleDriver(null);
        return;
      }

      if (event.detail?.recovered && event.detail?.userData) {
        console.log("[AirportTransfer] Auth recovered, updating form data");
        const userData = event.detail.userData;
        setFormData((prev) => ({
          ...prev,
          fullName: userData.name || "",
        }));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[AirportTransfer] Tab became visible, validating auth state",
        );

        // Check if auth state is valid for vehicle loading
        if (!isAuthenticated || !userId) {
          console.warn(
            "[AirportTransfer] Invalid auth state, vehicles may not load",
          );
          // Trigger auth refresh
          window.dispatchEvent(new CustomEvent("authStateRefresh"));
        } else {
          console.log("[AirportTransfer] Auth state is valid");
          // Refresh vehicle data if needed
          if (
            availableVehiclesWithDrivers.length === 0 &&
            formData.vehicleType
          ) {
            console.log(
              "[AirportTransfer] Refreshing vehicle data after auth validation",
            );
            fetchAvailableVehiclesWithDrivers(formData.vehicleType);
          }
        }
      }
    };

    // Add event listeners
    window.addEventListener(
      "authStateRefreshed",
      handleAuthStateChange as EventListener,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(
        "authStateRefreshed",
        handleAuthStateChange as EventListener,
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    isAuthenticated,
    userId,
    formData.vehicleType,
    availableVehiclesWithDrivers.length,
    fetchAvailableVehiclesWithDrivers,
  ]);

  // Booking type state (instant or scheduled)
  const [bookingType, setBookingType] = useState<"instant" | "scheduled">(
    "instant",
  );

  // UI states
  const [isLoadingBooking, setIsLoadingBooking] = useState<boolean>(false);
  const [showFromMap, setShowFromMap] = useState<boolean>(false);
  const [showToMap, setShowToMap] = useState<boolean>(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isSearchingDriver, setIsSearchingDriver] = useState<boolean>(false);
  const [selectedVehicleDriver, setSelectedVehicleDriver] = useState<any>(null);

  // Terminal options for airport
  {
    /*  const terminals = [
    { name: "Terminal 1A", position: [-6.125766, 106.65616] },
    { name: "Terminal 2D", position: [-6.123753973054377, 106.65172265118323] },
    { name: "Terminal 2E", position: [-6.122176573287238, 106.65300357936765] },
    { name: "Terminal 2F", position: [-6.126944, 106.6575] },
    {
      name: "Terminal 3 Domestik",
      position: [-6.119777589726106, 106.66638611807755],
    },
    {
      name: "Terminal 3 International",
      position: [-6.119777589726106, 106.66638611807755],
    },
  ];*/
  }

  // Vehicle types with pricing - fetched dynamically from price_km table
  const [vehicleTypes, setVehicleTypes] = useState<
    {
      name: string;
      price_per_km: number;
      basic_price: number;
      surcharge: number;
      minimum_distance: number;
    }[]
  >([]);

  // Fetch available vehicle types from price_km table - wait for session ready with validation
  useEffect(() => {
    if (!isSessionReady) {
      console.log("[AirportTransfer] Waiting for session to be ready...");
      return;
    }

    console.log(
      "[AirportTransfer] Session ready, fetching vehicle types with validation",
    );

    const fetchVehicleTypes = async () => {
      try {
        console.log("🔍 Starting fetchVehicleTypes...");
        console.log("🔗 Supabase client status:", {
          client: !!supabase,
          url: supabase?.supabaseUrl,
          key: supabase?.supabaseKey ? "[PRESENT]" : "[MISSING]",
        });

        // Always provide default vehicle types first
        const defaultTypes = [
          {
            name: "MPV",
            price_per_km: 3500,
            basic_price: 80000,
            surcharge: 45000,
            minimum_distance: 8,
          },
          {
            name: "Electric",
            price_per_km: 3000,
            basic_price: 70000,
            surcharge: 35000,
            minimum_distance: 8,
          },
        ];

        // Set default types immediately to prevent "No pricing data found" error
        setVehicleTypes(defaultTypes);
        console.log("✅ Set default vehicle types:", defaultTypes);

        // Set default form data if not already set
        if (!formData.vehicleType) {
          setFormData((prev) => ({
            ...prev,
            vehicleType: defaultTypes[0].name,
            vehiclePricePerKm: defaultTypes[0].price_per_km,
            basicPrice: defaultTypes[0].basic_price,
            surcharge: defaultTypes[0].surcharge,
          }));
          console.log("✅ Set default form data with:", defaultTypes[0]);
        }

        // Check if we're using a mock Supabase client
        const isMockClient =
          !supabase?.supabaseUrl ||
          supabase?.supabaseUrl === "https://placeholder-project.supabase.co";

        if (isMockClient) {
          console.warn(
            "⚠️ Using mock Supabase client - database operations will not work",
          );
          console.warn(
            "⚠️ Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables",
          );
          return; // Exit early with default types already set
        }

        // Test basic connection first
        console.log("🧪 Testing basic Supabase connection...");
        const { data: testData, error: testError } = await supabase
          .from("price_km")
          .select("count", { count: "exact", head: true });

        console.log("🧪 Connection test result:", {
          count: testData,
          error: testError,
          errorDetails: testError
            ? {
                message: testError.message,
                details: testError.details,
                hint: testError.hint,
                code: testError.code,
              }
            : null,
        });

        if (testError) {
          console.error("❌ Basic connection test failed:", testError);
          throw new Error(`Database connection failed: ${testError.message}`);
        }

        // First, let's check what's in the table
        console.log("📋 Fetching all data from price_km table...");
        const { data: allData, error: allError } = await supabase
          .from("price_km")
          .select("*")
          .order("vehicle_type", { ascending: true });

        console.log("📋 All data query result:", {
          dataCount: allData?.length || 0,
          data: allData,
          error: allError,
          errorDetails: allError
            ? {
                message: allError.message,
                details: allError.details,
                hint: allError.hint,
                code: allError.code,
              }
            : null,
        });

        if (allError) {
          console.error("❌ Error fetching all data:", allError);
          throw allError;
        }

        if (!allData || allData.length === 0) {
          console.warn("⚠️ No data found in price_km table at all!");
          throw new Error("No data found in price_km table");
        }

        // Log each record for debugging
        console.log("📊 Detailed data analysis:");
        allData.forEach((record, index) => {
          console.log(`Record ${index + 1}:`, {
            vehicle_type: record.vehicle_type,
            price_per_km: record.price_per_km,
            basic_price: record.basic_price,
            surcharge: record.surcharge,
            is_active: record.is_active,
            minimum_distance: record.minimum_distance,
          });
        });

        // Now fetch active vehicle types
        console.log("🎯 Fetching active vehicle types...");
        const { data, error } = await supabase
          .from("price_km")
          .select(
            "vehicle_type, price_per_km, basic_price, surcharge, minimum_distance, is_active",
          )
          .eq("is_active", true)
          .order("vehicle_type", { ascending: true });

        console.log("📊 Active vehicle types query result:", {
          dataCount: data?.length || 0,
          data,
          error,
          errorDetails: error
            ? {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
              }
            : null,
        });

        if (error) {
          console.error("❌ Error fetching active vehicle types:", error);
          console.log("🔄 Trying fallback query without is_active filter...");

          // Try to fetch without is_active filter as fallback
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("price_km")
            .select(
              "vehicle_type, price_per_km, basic_price, surcharge, minimum_distance, is_active",
            )
            .order("vehicle_type", { ascending: true });

          console.log("🔄 Fallback query result:", {
            dataCount: fallbackData?.length || 0,
            data: fallbackData,
            error: fallbackError,
          });

          if (fallbackError || !fallbackData || fallbackData.length === 0) {
            console.warn(
              "⚠️ Fallback query also failed, using default vehicle types",
            );
            const defaultTypes = [
              {
                name: "MPV",
                price_per_km: 3500,
                basic_price: 80000,
                surcharge: 45000,
                minimum_distance: 8,
              },
              {
                name: "Electric",
                price_per_km: 3000,
                basic_price: 70000,
                surcharge: 35000,
                minimum_distance: 8,
              },
            ];
            setVehicleTypes(defaultTypes);
            console.log("✅ Set default vehicle types:", defaultTypes);

            if (!formData.vehicleType) {
              setFormData((prev) => ({
                ...prev,
                vehicleType: defaultTypes[0].name,
                vehiclePricePerKm: defaultTypes[0].price_per_km,
                basicPrice: defaultTypes[0].basic_price,
                surcharge: defaultTypes[0].surcharge,
              }));
              console.log("✅ Set default form data with:", defaultTypes[0]);
            }
            return;
          }

          // Use fallback data (all records)
          const types = fallbackData.map((item) => ({
            name: item.vehicle_type,
            price_per_km: Number(item.price_per_km),
            basic_price: Number(item.basic_price),
            surcharge: Number(item.surcharge),
            minimum_distance: Number(item.minimum_distance || 8),
          }));
          setVehicleTypes(types);
          console.log("✅ Using fallback data, found vehicle types:", types);

          if (!formData.vehicleType && types.length > 0) {
            setFormData((prev) => ({
              ...prev,
              vehicleType: types[0].name,
              vehiclePricePerKm: types[0].price_per_km,
              basicPrice: types[0].basic_price,
              surcharge: types[0].surcharge,
            }));
            console.log("✅ Set form data from fallback with:", types[0]);
          }
          return;
        }

        if (data && data.length > 0) {
          const types = data.map((item) => ({
            name: item.vehicle_type,
            price_per_km: Number(item.price_per_km),
            basic_price: Number(item.basic_price),
            surcharge: Number(item.surcharge),
            minimum_distance: Number(item.minimum_distance || 8),
          }));

          // Update with database types (overriding defaults)
          setVehicleTypes(types);
          console.log(
            "✅ Successfully fetched active vehicle types from database:",
            types,
          );

          const mpvType = types.find((t) => t.name === "MPV");
          console.log("🎯 MPV found in database results:", mpvType);

          if (!mpvType) {
            console.warn("⚠️ MPV not found in database vehicle types!");
            console.log(
              "Available types from database:",
              types.map((t) => t.name),
            );
          }

          // Update form data with database pricing if current vehicle type exists in database
          const currentVehicleTypeInDb = types.find(
            (t) => t.name === formData.vehicleType,
          );
          if (currentVehicleTypeInDb) {
            setFormData((prev) => ({
              ...prev,
              vehiclePricePerKm: currentVehicleTypeInDb.price_per_km,
              basicPrice: currentVehicleTypeInDb.basic_price,
              surcharge: currentVehicleTypeInDb.surcharge,
            }));
            console.log(
              "✅ Updated form data with database pricing for:",
              currentVehicleTypeInDb.name,
            );
          }
        } else {
          console.warn(
            "⚠️ No active vehicle types found in price_km table, keeping defaults",
          );
          // Default types are already set above, so we don't need to set them again
        }
      } catch (err) {
        console.error("❌ Failed to fetch vehicle types from price_km:", err);
        console.error("❌ Error details:", {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
          cause: err?.cause,
        });

        // Default types are already set above, so we don't need to set them again
        console.log(
          "✅ Using previously set default vehicle types due to database error",
        );

        // Show user-friendly error
        toast({
          title: "Database Connection Issue",
          description:
            "Using default pricing. Please check your internet connection or contact support.",
          variant: "destructive",
        });

        // Log environment variable status for debugging
        console.log("🔧 Environment variables check:", {
          VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL
            ? "[SET]"
            : "[MISSING]",
          VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
            ? "[SET]"
            : "[MISSING]",
          actualUrl: import.meta.env.VITE_SUPABASE_URL,
        });
      }
    };

    fetchVehicleTypes();
  }, [isSessionReady]);

  // Calculate route distance and duration - only once when locations are set
  useEffect(() => {
    // Reset distance and duration when addresses change
    if (formData.fromAddress === "" || formData.toAddress === "") {
      console.log("🔄 Resetting distance and duration - addresses cleared");
      setFormData((prev) => ({
        ...prev,
        distance: 0,
        duration: 0,
      }));
      setRouteCalculated(false); // Reset route calculation state
      return;
    }

    // Only calculate if we have valid coordinates and addresses AND route hasn't been calculated
    if (
      formData.fromLocation[0] !== 0 &&
      formData.toLocation[0] !== 0 &&
      formData.fromAddress &&
      formData.toAddress &&
      !routeCalculated &&
      formData.distance === 0 // Only calculate if distance is not already set
    ) {
      console.log(`🗺️ INITIAL ROUTE CALCULATION:`, {
        from: formData.fromAddress,
        to: formData.toAddress,
        fromCoords: formData.fromLocation,
        toCoords: formData.toLocation,
        currentDistance: formData.distance,
        routeCalculated,
        timestamp: new Date().toISOString(),
      });
      getRouteDetails(formData.fromLocation, formData.toLocation);
    } else {
      console.log(`🚫 SKIPPING ROUTE CALCULATION:`, {
        hasFromLocation: formData.fromLocation[0] !== 0,
        hasToLocation: formData.toLocation[0] !== 0,
        hasFromAddress: !!formData.fromAddress,
        hasToAddress: !!formData.toAddress,
        routeCalculated,
        currentDistance: formData.distance,
        reason: routeCalculated
          ? "Already calculated"
          : formData.distance > 0
            ? "Distance already set"
            : "Missing data",
      });
    }
  }, [
    formData.fromLocation,
    formData.toLocation,
    formData.fromAddress,
    formData.toAddress,
  ]);

  // Calculate price when distance, vehicle type, or vehicle price per km changes
  useEffect(() => {
    const calculatePriceFromData = async () => {
      if (formData.distance <= 0) {
        console.log("Distance is 0 or negative, skipping price calculation");
        return;
      }

      try {
        let price = 0;
        let pricingSource = "unknown";
        let finalPriceKm = 0;
        let finalBasicPrice = 0;
        let finalSurcharge = 0;

        console.log(
          `🔍 Starting price calculation with distance: ${formData.distance}km`,
        );

        // Priority 1: Use selected vehicle driver pricing if available (for instant booking)
        if (
          selectedVehicleDriver &&
          selectedVehicleDriver.price_km &&
          selectedVehicleDriver.basic_price
        ) {
          finalPriceKm = Number(selectedVehicleDriver.price_km) || 0;
          finalBasicPrice = Number(selectedVehicleDriver.basic_price) || 0;
          finalSurcharge = Number(selectedVehicleDriver.surcharge) || 0;
          pricingSource = "selectedVehicleDriver";
          console.log(`🎯 Using selected vehicle driver pricing:`, {
            driver: selectedVehicleDriver.driver_name,
            vehicle: `${selectedVehicleDriver.make} ${selectedVehicleDriver.model}`,
            distance: formData.distance,
            priceKm: finalPriceKm,
            basicPrice: finalBasicPrice,
            surcharge: finalSurcharge,
          });
        }
        // Priority 2: Use selected driver pricing if available (for scheduled booking)
        else if (
          selectedDriver &&
          selectedDriver.price_km &&
          selectedDriver.basic_price
        ) {
          finalPriceKm = Number(selectedDriver.price_km) || 0;
          finalBasicPrice = Number(selectedDriver.basic_price) || 0;
          finalSurcharge = Number(selectedDriver.surcharge) || 0;
          pricingSource = "selectedDriver";
          console.log(`🎯 Using selected driver pricing:`, {
            driver: selectedDriver.driver_name,
            distance: formData.distance,
            priceKm: finalPriceKm,
            basicPrice: finalBasicPrice,
            surcharge: finalSurcharge,
          });
        }
        // Priority 3: Use form data pricing if available
        else if (formData.vehiclePricePerKm > 0 && formData.basicPrice > 0) {
          finalPriceKm = Number(formData.vehiclePricePerKm) || 0;
          finalBasicPrice = Number(formData.basicPrice) || 0;
          finalSurcharge = Number(formData.surcharge) || 0;
          pricingSource = "formData";
          console.log(`🎯 Using form data pricing:`, {
            vehicleType: formData.vehicleType,
            distance: formData.distance,
            priceKm: finalPriceKm,
            basicPrice: finalBasicPrice,
            surcharge: finalSurcharge,
          });
        }
        // Priority 4: Get pricing from vehicle types
        else if (formData.vehicleType) {
          const vehiclePricing = getPricingFromVehicleTypes(
            formData.vehicleType,
          );
          if (vehiclePricing.priceKm > 0 && vehiclePricing.basicPrice > 0) {
            finalPriceKm = vehiclePricing.priceKm;
            finalBasicPrice = vehiclePricing.basicPrice;
            finalSurcharge = vehiclePricing.surcharge;
            pricingSource = "vehicleTypes";
            console.log(`🎯 Using vehicle types pricing:`, {
              vehicleType: formData.vehicleType,
              distance: formData.distance,
              priceKm: finalPriceKm,
              basicPrice: finalBasicPrice,
              surcharge: finalSurcharge,
            });
          }
        }

        // Priority 5: Fallback to database pricing
        if (finalPriceKm === 0 && formData.vehicleType) {
          const vehiclePricing = await getPricingFromDatabase(
            formData.vehicleType,
          );
          if (vehiclePricing.priceKm > 0 && vehiclePricing.basicPrice > 0) {
            finalPriceKm = vehiclePricing.priceKm;
            finalBasicPrice = vehiclePricing.basicPrice;
            finalSurcharge = vehiclePricing.surcharge;
            pricingSource = "database";
            console.log(`🎯 Using database pricing:`, {
              vehicleType: formData.vehicleType,
              distance: formData.distance,
              priceKm: finalPriceKm,
              basicPrice: finalBasicPrice,
              surcharge: finalSurcharge,
            });
          }
        }

        // Calculate final price using consistent pricing data
        if (finalPriceKm > 0 && finalBasicPrice > 0) {
          price = calculatePrice(
            formData.distance,
            finalPriceKm,
            finalBasicPrice,
            finalSurcharge,
          );

          console.log(`💰 Final price calculation result:`, {
            distance: formData.distance,
            vehicleType: formData.vehicleType,
            priceKm: finalPriceKm,
            basicPrice: finalBasicPrice,
            surcharge: finalSurcharge,
            calculatedPrice: price,
            pricingSource,
            currentFormPrice: formData.price,
            source: "main_calculation",
          });

          // Update form data with consistent pricing information
          setFormData((prev) => ({
            ...prev,
            price,
            vehiclePricePerKm: finalPriceKm,
            basicPrice: finalBasicPrice,
            surcharge: finalSurcharge,
          }));
        } else {
          console.warn(`⚠️ No valid pricing data found for calculation`);
        }
      } catch (error) {
        console.error("❌ Error calculating price:", error);
        toast({
          title: "Price Calculation Error",
          description: "Could not calculate price. Please try again.",
          variant: "destructive",
        });
      }
    };

    calculatePriceFromData();
  }, [
    formData.distance,
    formData.vehicleType,
    selectedDriver?.price_km,
    selectedDriver?.basic_price,
    selectedDriver?.surcharge,
    selectedVehicleDriver?.price_km,
    selectedVehicleDriver?.basic_price,
    selectedVehicleDriver?.surcharge,
  ]);

  // Update vehicle pricing data when vehicle type changes
  useEffect(() => {
    const updateVehiclePricing = () => {
      if (!formData.vehicleType || vehicleTypes.length === 0) return;

      // Find the selected vehicle type from the fetched data
      const selectedVehicleType = vehicleTypes.find(
        (type) => type.name === formData.vehicleType,
      );

      if (selectedVehicleType) {
        console.log(
          `Vehicle type ${formData.vehicleType} pricing from price_km table:`,
          {
            price_per_km: selectedVehicleType.price_per_km,
            basic_price: selectedVehicleType.basic_price,
            surcharge: selectedVehicleType.surcharge,
            minimum_distance: selectedVehicleType.minimum_distance,
          },
        );

        setFormData((prev) => ({
          ...prev,
          vehiclePricePerKm: selectedVehicleType.price_per_km,
          basicPrice: selectedVehicleType.basic_price,
          surcharge: selectedVehicleType.surcharge,
        }));
      } else {
        console.warn(`No pricing data found for ${formData.vehicleType}`);
        // Use default values
        setFormData((prev) => ({
          ...prev,
          vehiclePricePerKm: 3250,
          basicPrice: 75000,
          surcharge: 40000,
        }));
      }
    };

    updateVehiclePricing();

    // Reset selected driver when vehicle type changes
    setSelectedDriver(null);
    setFormData((prev) => ({
      ...prev,
      driverId: null,
      driverName: "",
      driverPhone: "",
      driverPhoto: "",
      vehicleName: "",
      vehicleModel: "",
      vehiclePlate: "",
      vehicleColor: "",
    }));

    // Fetch available vehicles with drivers for instant booking
    if (bookingType === "instant" && formData.vehicleType) {
      fetchAvailableVehiclesWithDrivers(formData.vehicleType);
    }
  }, [formData.vehicleType, vehicleTypes, bookingType]);

  // Helper function to get pricing from price_km table based on vehicle type
  function getPricingFromVehicleTypes(vehicleType: string) {
    const selectedVehicleType = vehicleTypes.find(
      (type) => type.name === vehicleType,
    );

    if (selectedVehicleType) {
      console.log(`✅ Found pricing data for ${vehicleType}:`, {
        priceKm: selectedVehicleType.price_per_km,
        basicPrice: selectedVehicleType.basic_price,
        surcharge: selectedVehicleType.surcharge,
      });
      return {
        priceKm: selectedVehicleType.price_per_km,
        basicPrice: selectedVehicleType.basic_price,
        surcharge: selectedVehicleType.surcharge,
      };
    }

    // Return default values if not found
    console.warn(`⚠️ No pricing data found for ${vehicleType}, using defaults`);
    console.log(
      `Available vehicle types:`,
      vehicleTypes.map((t) => t.name),
    );

    // Use different defaults based on vehicle type
    const defaultPricing =
      vehicleType === "Electric"
        ? {
            priceKm: 3000,
            basicPrice: 70000,
            surcharge: 35000,
          }
        : {
            priceKm: 3500,
            basicPrice: 80000,
            surcharge: 45000,
          };

    console.log(`✅ Using default pricing for ${vehicleType}:`, defaultPricing);
    return defaultPricing;
  }

  // Helper function to get pricing from database
  const getPricingFromDatabase = async (vehicleType: string) => {
    try {
      console.log(`🔍 Getting pricing for vehicle type: ${vehicleType}`);
      console.log(`🔗 Supabase client status:`, {
        client: !!supabase,
        url: supabase?.supabaseUrl,
        key: supabase?.supabaseKey ? "[PRESENT]" : "[MISSING]",
      });

      if (!vehicleType || vehicleType.trim() === "") {
        console.warn(`⚠️ Empty vehicle type provided`);
        return {
          priceKm: 3500,
          basicPrice: 80000,
          surcharge: 45000,
        };
      }

      // Check if we're using a mock Supabase client
      const isMockClient =
        !supabase?.supabaseUrl ||
        supabase?.supabaseUrl === "https://placeholder-project.supabase.co";

      if (isMockClient) {
        console.warn(
          `⚠️ Using mock client - returning default pricing for ${vehicleType}`,
        );
        return {
          priceKm: vehicleType === "MPV" ? 3500 : 3000,
          basicPrice: vehicleType === "MPV" ? 80000 : 70000,
          surcharge: vehicleType === "MPV" ? 45000 : 35000,
        };
      }

      // First check what's available in the table for this vehicle type
      console.log(`📋 Checking all data for vehicle type: ${vehicleType}`);
      const { data: allVehicleData, error: allVehicleError } = await supabase
        .from("price_km")
        .select("*")
        .eq("vehicle_type", vehicleType);

      console.log(`📋 All data for ${vehicleType}:`, {
        dataCount: allVehicleData?.length || 0,
        data: allVehicleData,
        error: allVehicleError,
        errorDetails: allVehicleError
          ? {
              message: allVehicleError.message,
              details: allVehicleError.details,
              hint: allVehicleError.hint,
              code: allVehicleError.code,
            }
          : null,
      });

      if (allVehicleError) {
        console.error(
          `❌ Error checking data for ${vehicleType}:`,
          allVehicleError,
        );
        throw allVehicleError;
      }

      if (!allVehicleData || allVehicleData.length === 0) {
        console.warn(`⚠️ No data found for vehicle type ${vehicleType}`);
        console.log(`🔍 Available vehicle types in database:`);

        // Check what vehicle types are actually available
        const { data: availableTypes } = await supabase
          .from("price_km")
          .select("vehicle_type")
          .order("vehicle_type");

        console.log(
          `Available types:`,
          availableTypes?.map((t) => t.vehicle_type) || [],
        );

        return {
          priceKm: 3500,
          basicPrice: 80000,
          surcharge: 45000,
        };
      }

      // Log detailed info about found records
      allVehicleData.forEach((record, index) => {
        console.log(`${vehicleType} record ${index + 1}:`, {
          vehicle_type: record.vehicle_type,
          price_per_km: record.price_per_km,
          basic_price: record.basic_price,
          surcharge: record.surcharge,
          is_active: record.is_active,
          minimum_distance: record.minimum_distance,
        });
      });

      // Now try to get active pricing
      console.log(`🎯 Fetching active pricing for ${vehicleType}`);
      const { data, error } = await supabase
        .from("price_km")
        .select("price_per_km, basic_price, surcharge, is_active")
        .eq("vehicle_type", vehicleType)
        .eq("is_active", true)
        .limit(1);

      console.log(`📊 Active pricing query result for ${vehicleType}:`, {
        dataCount: data?.length || 0,
        data,
        error,
        errorDetails: error
          ? {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            }
          : null,
        query: {
          table: "price_km",
          filters: {
            vehicle_type: vehicleType,
            is_active: true,
          },
        },
      });

      if (error) {
        console.error(`❌ Database error for ${vehicleType}:`, error);
        console.warn(
          `⚠️ Database error for ${vehicleType}, trying without is_active filter`,
        );

        // Try without is_active filter as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("price_km")
          .select("price_per_km, basic_price, surcharge, is_active")
          .eq("vehicle_type", vehicleType)
          .limit(1);

        console.log(`🔄 Fallback pricing query for ${vehicleType}:`, {
          dataCount: fallbackData?.length || 0,
          data: fallbackData,
          error: fallbackError,
        });

        if (fallbackError || !fallbackData || fallbackData.length === 0) {
          console.warn(
            `❌ No pricing data found in database for ${vehicleType}, using defaults`,
          );
          return {
            priceKm: 3500, // Default for MPV
            basicPrice: 80000,
            surcharge: 45000,
          };
        }

        const result = {
          priceKm: Number(fallbackData[0].price_per_km) || 3500,
          basicPrice: Number(fallbackData[0].basic_price) || 80000,
          surcharge: Number(fallbackData[0].surcharge) || 45000,
        };
        console.log(`✅ Found fallback pricing for ${vehicleType}:`, result);
        return result;
      }

      if (!data || data.length === 0) {
        console.warn(
          `⚠️ No active pricing data found for ${vehicleType}, trying without is_active filter`,
        );

        // Try without is_active filter as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("price_km")
          .select("price_per_km, basic_price, surcharge, is_active")
          .eq("vehicle_type", vehicleType)
          .limit(1);

        console.log(`🔄 Fallback pricing query for ${vehicleType}:`, {
          dataCount: fallbackData?.length || 0,
          data: fallbackData,
          error: fallbackError,
        });

        if (fallbackError || !fallbackData || fallbackData.length === 0) {
          console.warn(
            `❌ No pricing data found in database for ${vehicleType}, using defaults`,
          );
          return {
            priceKm: 3500, // Default for MPV
            basicPrice: 80000,
            surcharge: 45000,
          };
        }

        const result = {
          priceKm: Number(fallbackData[0].price_per_km) || 3500,
          basicPrice: Number(fallbackData[0].basic_price) || 80000,
          surcharge: Number(fallbackData[0].surcharge) || 45000,
        };
        console.log(`✅ Found fallback pricing for ${vehicleType}:`, result);
        return result;
      }

      const result = {
        priceKm: Number(data[0].price_per_km) || 3500,
        basicPrice: Number(data[0].basic_price) || 80000,
        surcharge: Number(data[0].surcharge) || 45000,
      };

      console.log(`✅ Found active pricing for ${vehicleType}:`, result);
      return result;
    } catch (err) {
      console.error(
        `❌ Exception while fetching pricing for ${vehicleType}:`,
        err,
      );
      console.error(`❌ Exception details:`, {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        cause: err?.cause,
      });

      // Always return default values on error
      const defaultResult = {
        priceKm: 3500,
        basicPrice: 80000,
        surcharge: 45000,
      };
      console.log(
        `✅ Returning default pricing for ${vehicleType}:`,
        defaultResult,
      );
      return defaultResult;
    }
  };

  // Validate form based on current step
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1: // Location & Schedule
        if (bookingType === "instant") {
          return (
            formData.fromAddress.trim() !== "" &&
            formData.toAddress.trim() !== "" &&
            selectedVehicleDriver !== null // Require driver selection for instant booking
          );
        } else {
          return (
            formData.fromAddress.trim() !== "" &&
            formData.toAddress.trim() !== "" &&
            formData.pickupDate !== "" &&
            formData.pickupTime !== "" &&
            formData.vehicleType !== "" // Require vehicle type selection for scheduled booking
          );
        }
      case 2: // Vehicle Selection & Confirmation
        // Only require vehicle type selection
        return (
          formData.fromAddress &&
          formData.toAddress &&
          formData.vehicleType !== ""
        );
      case 3: // Booking Confirmation
        return (
          formData.fullName.trim() !== "" &&
          formData.phoneNumber.trim() !== "" &&
          formData.paymentMethod !== ""
        );
      default:
        return true;
    }
  };

  // Generate a unique booking code
  function generateCodeBooking() {
    return `AT-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  // Calculate price based on distance and vehicle data from database
  function calculatePrice(
    distanceKm: number,
    pricePerKm: number,
    basicPrice: number,
    surcharge: number,
  ): number {
    // Convert all inputs to numbers and validate
    const distance = Number(distanceKm) || 0;
    const priceKm = Number(pricePerKm) || 0;
    const basic = Number(basicPrice) || 0;
    const charge = Number(surcharge) || 0;

    // Validate inputs to prevent NaN results
    if (distance <= 0 || priceKm <= 0 || basic <= 0) {
      console.error("Invalid price calculation inputs:", {
        distanceKm: distance,
        pricePerKm: priceKm,
        basicPrice: basic,
        surcharge: charge,
      });
      return 0;
    }

    const baseDistance = 8; // First 8 km use basic_price

    // Round distance to 1 decimal place for accuracy
    const roundedDistance = Math.round(distance * 10) / 10;

    let total = 0;

    // Apply pricing formula consistently
    if (roundedDistance <= baseDistance) {
      total = basic + charge;
    } else {
      const extraDistance = roundedDistance - baseDistance;
      total = basic + extraDistance * priceKm + charge;
    }

    const finalPrice = Math.round(total);

    console.log(`✅ Price calculation for ${roundedDistance}km:`, {
      distance: roundedDistance,
      pricePerKm: priceKm,
      basicPrice: basic,
      surcharge: charge,
      baseDistance,
      extraDistance:
        roundedDistance > baseDistance ? roundedDistance - baseDistance : 0,
      total: finalPrice,
      formula:
        roundedDistance <= baseDistance
          ? `${basic} + ${charge} = ${finalPrice}`
          : `${basic} + (${roundedDistance - baseDistance} × ${priceKm}) + ${charge} = ${finalPrice}`,
    });

    return finalPrice;
  }

  // Get route details using OSRM - only calculate once
  async function getRouteDetails(
    from: [number, number] | null,
    to: [number, number] | null,
  ) {
    // Handle null values
    if (!from || !to) {
      console.warn("Missing coordinates for route calculation");
      return;
    }

    const [fromLat, fromLng] = from;
    const [toLat, toLng] = to;

    // Check if coordinates are valid
    if (fromLat === 0 || fromLng === 0 || toLat === 0 || toLng === 0) {
      console.warn("Invalid coordinates for route calculation");
      return;
    }

    // Skip calculation if route has already been calculated
    if (routeCalculated || formData.distance > 0) {
      console.log("🔄 Route already calculated, skipping:", {
        existingDistance: formData.distance,
        existingDuration: formData.duration,
        routeCalculated,
      });
      return;
    }

    // Check if coordinates are the same (very close locations)
    const isSameLocation =
      Math.abs(fromLat - toLat) < 0.0001 && Math.abs(fromLng - toLng) < 0.0001;

    if (isSameLocation) {
      // Set minimal values for same location
      setFormData((prev) => ({
        ...prev,
        distance: 0.1, // 100 meters minimum
        duration: 1, // 1 minute minimum
      }));
      setRouteCalculated(true);
      return;
    }

    try {
      // Use car driving profile explicitly
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full`,
      );
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const distanceKm = Math.max(0.1, data.routes[0].distance / 1000); // convert to km, minimum 0.1
        const durationMin = Math.max(
          1,
          Math.ceil(data.routes[0].duration / 60),
        ); // convert to minutes, minimum 1

        console.log(`✅ ROUTE CALCULATION SUCCESS:`, {
          rawDistance: data.routes[0].distance,
          distanceKm: distanceKm,
          rawDuration: data.routes[0].duration,
          durationMin: durationMin,
          source: "OSRM",
          fromCoords: [fromLat, fromLng],
          toCoords: [toLat, toLng],
          timestamp: new Date().toISOString(),
        });

        setFormData((prev) => {
          console.log(`📊 SETTING ROUTE DATA:`, {
            previousDistance: prev.distance,
            newDistance: distanceKm,
            previousDuration: prev.duration,
            newDuration: durationMin,
            timestamp: new Date().toISOString(),
          });
          return {
            ...prev,
            distance: distanceKm,
            duration: durationMin,
          };
        });

        // CRITICAL: Mark route as calculated to prevent recalculation
        setRouteCalculated(true);
        console.log(
          `🔒 ROUTE MARKED AS CALCULATED - No more calculations allowed`,
        );
      } else {
        console.warn("No route found from OSRM");
        // Set default values instead of showing error
        const directDistance = calculateDirectDistance(
          fromLat,
          fromLng,
          toLat,
          toLng,
        );

        console.log(`🛣️ No route found, using direct distance:`, {
          directDistance: directDistance,
          estimatedDuration: Math.ceil(directDistance * 2),
          source: "direct_calculation",
        });

        setFormData((prev) => ({
          ...prev,
          distance: directDistance,
          duration: Math.ceil(directDistance * 2), // Rough estimate: 30km/h average speed
        }));

        // Mark route as calculated
        setRouteCalculated(true);
      }
    } catch (err) {
      console.error("Error calling OSRM:", err);
      // Calculate direct distance as fallback
      const directDistance = calculateDirectDistance(
        fromLat,
        fromLng,
        toLat,
        toLng,
      );

      console.log(`🛣️ OSRM error, using direct distance fallback:`, {
        error: err.message,
        directDistance: directDistance,
        estimatedDuration: Math.ceil(directDistance * 2),
        source: "error_fallback",
      });

      setFormData((prev) => ({
        ...prev,
        distance: directDistance,
        duration: Math.ceil(directDistance * 2), // Rough estimate: 30km/h average speed
      }));
    }
  }

  // Calculate direct distance between two points using Haversine formula
  function calculateDirectDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.max(0.1, distance); // Minimum 0.1 km
  }

  function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Handle location swap
  const handleSwapLocation = () => {
    setFormData((prev) => ({
      ...prev,
      fromLocation: prev.toLocation,
      toLocation: prev.fromLocation,
      fromAddress: prev.toAddress,
      toAddress: prev.fromAddress,
    }));
  };

  // Search for available drivers who have rented vehicles matching the selected vehicle type
  const searchDrivers = async () => {
    setIsSearchingDriver(true);
    try {
      console.log(
        `🔍 Searching for drivers with ${formData.vehicleType} vehicles from bookings table`,
      );

      // First, get drivers who have rented vehicles from bookings table
      // and match the selected vehicle type
      console.log(
        `🔍 Searching for drivers with ${formData.vehicleType} vehicles`,
      );

      // Try exact match first
      let { data: bookingsWithDrivers, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
    driver_id,
    driver_name,
    vehicle_type,
    license_plate,
    make,
    model,
    drivers!bookings_driver_id_fkey (
      id,
      id_driver,
      name,
      phone_number,
      selfie_url,
      status,
      is_online
    )
  `,
        )
        .eq("vehicle_type", formData.vehicleType)
        .eq("drivers.status", "Standby") // ✅ filter Standby di server
        .eq("drivers.is_online", true) // ✅ filter Online di server
        .not("driver_id", "is", null)
        .not("drivers", "is", null);

      // If no exact matches found, try case-insensitive search
      if (
        (!bookingsWithDrivers || bookingsWithDrivers.length === 0) &&
        !bookingsError
      ) {
        console.log(
          `🔄 No exact matches for ${formData.vehicleType}, trying case-insensitive search`,
        );

        const { data: bookingsWithDrivers2, error: bookingsError2 } =
          await supabase
            .from("bookings")
            .select(
              `
      driver_id,
      driver_name,
      vehicle_type,
      license_plate,
      make,
      model,
      drivers!bookings_driver_id_fkey (
        id,
        id_driver,
        name,
        phone_number,
        selfie_url,
        status,
        is_online
      )
    `,
            )
            .ilike("vehicle_type", `%${formData.vehicleType}%`)
            .eq("drivers.status", "Standby")
            .eq("drivers.is_online", true)
            .not("driver_id", "is", null)
            .not("drivers", "is", null);

        if (!bookingsError2) {
          bookingsWithDrivers = bookingsWithDrivers2;
          bookingsError = bookingsError2;
        }
      }

      if (bookingsError) {
        console.error(
          "❌ Error fetching bookings with drivers:",
          bookingsError,
        );
        throw bookingsError;
      }

      console.log(
        "📋 Bookings with drivers found:",
        bookingsWithDrivers?.length || 0,
      );

      // Filter drivers who are "Standby" and Online
      const availableDriversFromBookings = [];

      for (const booking of bookingsWithDrivers || []) {
        if (!booking.drivers) continue;

        const driver = booking.drivers;

        // Only include drivers with "Standby" status and Online
        if (driver.status === "Standby" && driver.is_online === true) {
          // Get vehicle pricing for this vehicle type
          const { data: vehiclePricing, error: pricingError } = await supabase
            .from("price_km")
            .select("price_per_km, basic_price, surcharge")
            .eq("vehicle_type", formData.vehicleType)
            .eq("is_active", true)
            .limit(1);

          // Default pricing values
          let price_km = 3250;
          let basic_price = 75000;
          let surcharge = 40000;

          if (!pricingError && vehiclePricing && vehiclePricing.length > 0) {
            const pricing = vehiclePricing[0];
            price_km = Number(pricing.price_per_km) || price_km;
            basic_price = Number(pricing.basic_price) || basic_price;
            surcharge = Number(pricing.surcharge) || surcharge;
          }

          const driverEntry = {
            id: driver.id,
            id_driver: driver.id_driver,
            driver_name: driver.name,
            phone_number: driver.phone_number,
            photo_url: driver.selfie_url,
            status: driver.status,
            license_plate: booking.license_plate || "N/A",
            vehicle_name: booking.make || "Unknown",
            vehicle_model: booking.model || "Unknown",
            vehicle_type: booking.vehicle_type,
            vehicle_color: "N/A", // Not available in bookings table
            distance: Math.round(Math.random() * 5 + 1), // Simulated distance
            eta: Math.round(Math.random() * 10 + 5), // Simulated ETA
            price_km,
            basic_price,
            surcharge,
          };

          // Avoid duplicates by checking if driver already exists
          const existingDriver = availableDriversFromBookings.find(
            (existing) => existing.id === driver.id,
          );

          if (!existingDriver) {
            availableDriversFromBookings.push(driverEntry);
            console.log(
              `✅ Added driver: ${driver.name} with ${booking.vehicle_type} (${booking.make} ${booking.model})`,
            );
          }
        } else {
          console.log(
            `⏭️ Skipping driver ${driver.name}: status=${driver.status}, online=${driver.is_online}`,
          );
        }
      }

      console.log(
        `🎯 Found ${availableDriversFromBookings.length} available drivers with ${formData.vehicleType} vehicles:`,
        availableDriversFromBookings.map(
          (d) =>
            `${d.driver_name} - ${d.vehicle_name} ${d.vehicle_model} (${d.vehicle_type})`,
        ),
      );

      // Debug: If no drivers found, check what vehicle types exist in bookings
      if (availableDriversFromBookings.length === 0) {
        console.log(
          `⚠️ No drivers found for ${formData.vehicleType}. Checking what vehicle types exist in bookings...`,
        );

        const { data: allBookingVehicleTypes } = await supabase
          .from("bookings")
          .select("vehicle_type, make, model, driver_name")
          .not("driver_id", "is", null);

        console.log(`📊 All vehicle types in bookings:`, [
          ...new Set(allBookingVehicleTypes?.map((b) => b.vehicle_type) || []),
        ]);

        console.log(
          `📊 All bookings with vehicles:`,
          allBookingVehicleTypes?.map(
            (b) =>
              `${b.driver_name} - ${b.make} ${b.model} (${b.vehicle_type})`,
          ) || [],
        );
      }

      if (availableDriversFromBookings.length > 0) {
        setAvailableDrivers(availableDriversFromBookings);
        return;
      }

      // If no drivers found from bookings, show message
      console.log(
        "⚠️ No drivers found with rented vehicles matching the criteria",
      );
      setAvailableDrivers([]);
    } catch (err) {
      console.error("❌ Error searching drivers:", err);
      toast({
        title: "Driver Search Failed",
        description: "Could not find available drivers with rented vehicles",
        variant: "destructive",
      });
      setAvailableDrivers([]);
    } finally {
      setIsSearchingDriver(false);
    }
  };

  // Select a driver
  const handleSelectDriver = async (driver: Driver) => {
    console.log("Selected driver:", driver);
    setSelectedDriver(driver);

    try {
      // Get vehicle type from driver or use current form data
      const vehicleType = driver.vehicle_type || formData.vehicleType;

      // Fetch pricing data from database based on vehicle type
      const { data, error } = await supabase
        .from("vehicles")
        .select("price_km, basic_price, surcharge")
        .eq("type", vehicleType)
        .limit(1);

      // Default values to use if there's an error or no data
      let driverPriceKm = 3250;
      let driverBasicPrice = 75000;
      let driverSurcharge = 40000;

      if (error) {
        console.error(`Error fetching pricing for ${vehicleType}:`, error);
        // Continue with default values
      } else if (!data || data.length === 0) {
        console.error(`No pricing data found for ${vehicleType}`);
        // Continue with default values
      } else {
        // Ensure all price values are properly converted to numbers
        const tempPriceKm = Number(data[0].price_km);
        const tempBasicPrice = Number(data[0].basic_price);
        const tempSurcharge = Number(data[0].surcharge);

        // Only use database values if they are valid numbers
        if (!isNaN(tempPriceKm)) driverPriceKm = tempPriceKm;
        if (!isNaN(tempBasicPrice)) driverBasicPrice = tempBasicPrice;
        if (!isNaN(tempSurcharge)) driverSurcharge = tempSurcharge;
      }

      // Calculate price based on current distance and driver's pricing data
      const estimatedPrice = calculatePrice(
        formData.distance,
        driverPriceKm,
        driverBasicPrice,
        driverSurcharge,
      );

      // Use the id_driver field if available, otherwise fall back to id
      const driverIdToUse =
        driver.id_driver !== undefined &&
        driver.id_driver !== null &&
        driver.id_driver !== 0
          ? driver.id_driver
          : driver.id;

      console.log("Setting driver ID in form:", driverIdToUse);

      setFormData((prev) => ({
        ...prev,
        driverId: String(driverIdToUse),
        driverName: driver.driver_name,
        driverPhone: driver.phone_number,
        driverPhoto: driver.photo_url || "",
        vehicleType: vehicleType,
        vehicleName: driver.vehicle_name || "Unknown",
        vehicleModel: driver.vehicle_model || "",
        vehiclePlate: driver.license_plate || "N/A",
        vehicleColor: driver.vehicle_color || "N/A",
        vehicleMake: driver.vehicle_make || "N/A",
        vehiclePricePerKm: driverPriceKm,
        basicPrice: driverBasicPrice,
        surcharge: driverSurcharge,
        price: estimatedPrice, // Set the price directly here
      }));
    } catch (err) {
      console.error("Error selecting driver:", err);
      toast({
        title: "Error",
        description: "Could not select driver. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle next step
  const handleNextStep = async () => {
    if (currentStep === 1) {
      setIsLoadingBooking(true);
      try {
        // Validate required fields first
        if (!formData.fromAddress || !formData.toAddress) {
          toast({
            title: "Missing Information",
            description: "Please provide both pickup and dropoff locations.",
            variant: "destructive",
          });
          setIsLoadingBooking(false);
          return;
        }

        // Set current date and time for instant booking
        if (bookingType === "instant") {
          const now = new Date();
          const today = now.toISOString().split("T")[0];
          const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

          setFormData((prev) => ({
            ...prev,
            pickupDate: today,
            pickupTime: currentTime,
          }));
        }

        // CRITICAL: Only geocode and calculate route if not already done
        if (formData.distance === 0 && !routeCalculated) {
          console.log(`🔍 GEOCODING AND ROUTE CALCULATION NEEDED:`, {
            currentDistance: formData.distance,
            routeCalculated,
            fromAddress: formData.fromAddress,
            toAddress: formData.toAddress,
            timestamp: new Date().toISOString(),
          });

          // Handle geocoding with timeout and error handling
          const geocodeWithTimeout = async (
            address: string,
            timeout = 10000,
          ) => {
            return Promise.race([
              geocodeAddress(address),
              new Promise<null>((_, reject) =>
                setTimeout(
                  () => reject(new Error("Geocoding timeout")),
                  timeout,
                ),
              ),
            ]);
          };

          // Geocode addresses if needed
          let fromCoords = formData.fromLocation;
          let toCoords = formData.toLocation;

          try {
            if (!fromCoords || fromCoords[0] === 0) {
              const coords = await geocodeWithTimeout(formData.fromAddress);
              if (coords) {
                fromCoords = coords;
              }
            }

            if (!toCoords || toCoords[0] === 0) {
              const coords = await geocodeWithTimeout(formData.toAddress);
              if (coords) {
                toCoords = coords;
              }
            }
          } catch (geocodeError) {
            console.warn(
              "Geocoding failed, using existing coordinates:",
              geocodeError,
            );
            // Keep existing coordinates if geocoding fails
            if (!fromCoords || fromCoords[0] === 0) {
              fromCoords =
                formData.fromLocation[0] !== 0
                  ? formData.fromLocation
                  : [-6.2, 106.8];
            }
            if (!toCoords || toCoords[0] === 0) {
              toCoords =
                formData.toLocation[0] !== 0
                  ? formData.toLocation
                  : [-6.2, 106.8];
            }
          }

          // Calculate route with timeout - only if distance is 0 and route not calculated
          if (fromCoords && toCoords) {
            try {
              await Promise.race([
                getRouteDetails(fromCoords, toCoords),
                new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Route calculation timeout")),
                    15000,
                  ),
                ),
              ]);

              setFormData((prev) => ({
                ...prev,
                fromLocation: fromCoords,
                toLocation: toCoords,
              }));

              setLocationsSelected(true);
            } catch (routeError) {
              console.warn("Route calculation failed:", routeError);
              // Set default values only if we don't have existing distance
              const defaultDistance =
                formData.distance > 0 ? formData.distance : 10;
              const defaultDuration =
                formData.duration > 0 ? formData.duration : 30;

              setFormData((prev) => ({
                ...prev,
                fromLocation: fromCoords,
                toLocation: toCoords,
                distance: defaultDistance,
                duration: defaultDuration,
              }));
              setLocationsSelected(true);
              setRouteCalculated(true); // Mark as calculated even if failed
            }
          }
        } else {
          // If distance is already calculated, just set locations selected
          setLocationsSelected(true);
          console.log(
            "✅ DISTANCE ALREADY CALCULATED - SKIPPING ROUTE CALCULATION:",
            {
              distance: formData.distance,
              duration: formData.duration,
              routeCalculated,
              reason:
                "Route already calculated, preventing duplicate calculation",
              timestamp: new Date().toISOString(),
            },
          );
        }

        // Move to next step (skip driver search)
        setCurrentStep(2);
      } catch (error) {
        console.error("Error in handleNextStep:", error);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingBooking(false);
      }
      return;
    }

    if (currentStep === 2) {
      // Skip driver selection and go directly to confirmation
      await handleDirectBooking();
      return;
    }

    if (currentStep === 3) {
      await handleSubmitBooking();
      return;
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    // If going back from confirmation to route & driver selection, reset driver selection
    if (currentStep === 3) {
      setSelectedDriver(null);
      setFormData((prev) => ({
        ...prev,
        driverId: null,
        driverName: "",
        driverPhone: "",
        driverPhoto: "",
        vehicleName: "",
        vehicleModel: "",
        vehiclePlate: "",
        vehicleColor: "",
      }));
    }

    // If going back from route & driver selection to location & schedule
    // Make sure we recalculate the price when returning to step 2
    if (currentStep === 2) {
      // We don't need to do anything special here anymore
      // The useEffect will handle price recalculation when the user changes addresses
    }

    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Send WhatsApp message function
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
            import.meta.env.FONNTE_API_KEY || "3hYIZghAc5N1!sUe3dMb",
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

  if (bookingType === "instant") {
    const now = new Date();
    formData.pickupDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    formData.pickupTime = now.toTimeString().slice(0, 5); // HH:MM
  }

  // Handle direct booking without driver selection
  const handleDirectBooking = async () => {
    // Ensure session is ready before proceeding
    if (!isSessionReady || !userId || !userEmail) {
      console.warn("[AirportTransfer] Session not ready for booking");
      alert("Please wait for session to load...");
      return;
    }

    setIsLoadingBooking(true);
    try {
      // Use the current form data pricing (which should already be consistent)
      let finalPrice = formData.price;
      let finalPriceKm = formData.vehiclePricePerKm;
      let finalBasicPrice = formData.basicPrice;
      let finalSurcharge = formData.surcharge;

      // If price is not set or pricing data is missing, calculate it
      if (finalPrice <= 0 || finalPriceKm <= 0 || finalBasicPrice <= 0) {
        console.log(`🔄 Recalculating price for direct booking`);

        // Use selected vehicle driver pricing if available
        if (
          selectedVehicleDriver &&
          selectedVehicleDriver.price_km &&
          selectedVehicleDriver.basic_price
        ) {
          finalPriceKm = Number(selectedVehicleDriver.price_km);
          finalBasicPrice = Number(selectedVehicleDriver.basic_price);
          finalSurcharge = Number(selectedVehicleDriver.surcharge) || 0;
          console.log(`✅ Using selected vehicle driver pricing for booking`);
        } else {
          // Fallback to vehicle type pricing
          const vehiclePricing = getPricingFromVehicleTypes(
            formData.vehicleType,
          );
          finalPriceKm = vehiclePricing.priceKm;
          finalBasicPrice = vehiclePricing.basicPrice;
          finalSurcharge = vehiclePricing.surcharge;
          console.log(`✅ Using vehicle type pricing for booking`);
        }

        finalPrice = calculatePrice(
          formData.distance,
          finalPriceKm,
          finalBasicPrice,
          finalSurcharge,
        );

        console.log(`💰 Direct booking price calculation:`, {
          distance: formData.distance,
          priceKm: finalPriceKm,
          basicPrice: finalBasicPrice,
          surcharge: finalSurcharge,
          calculatedPrice: finalPrice,
        });
      } else {
        console.log(`✅ Using existing form data pricing: ${finalPrice}`);
      }

      // Update form data with final pricing
      setFormData((prev) => ({
        ...prev,
        price: finalPrice,
        vehiclePricePerKm: finalPriceKm,
        basicPrice: finalBasicPrice,
        surcharge: finalSurcharge,
      }));

      // Create booking data for Supabase
      const bookingData = {
        id: uuidv4(), // Generate UUID for the id field
        code_booking: formData.codeBooking,
        customer_name: formData.fullName || "Guest Customer",
        phone: formData.phoneNumber || "",
        pickup_location: formData.fromAddress,
        dropoff_location: formData.toAddress,
        pickup_date: formData.pickupDate,
        pickup_time: formData.pickupTime,
        type: formData.vehicleType,
        price: finalPrice,
        passenger: formData.passenger,
        driver_id: selectedVehicleDriver?.uuid || null, // ✅ UUID dari drivers.id
        id_driver: selectedVehicleDriver?.id_driver || null, // ✅ integer dari drivers.id_driver
        driver_name: selectedVehicleDriver?.driver_name || "",
        payment_method: "pending",
        distance: formData.distance.toString(),
        duration: formData.duration.toString(),
        license_plate: selectedVehicleDriver?.license_plate || "N/A",
        model: selectedVehicleDriver?.model || "N/A",
        make: selectedVehicleDriver?.make || "N/A",
        vehicle_name: formData.vehicleType,
        status: "pending",
        customer_id: userId,
        from_location: formData.fromLocation,
        to_location: formData.toLocation,
      };

      // Insert booking to Supabase
      const { data, error } = await supabase
        .from("airport_transfer")
        .insert([bookingData])
        .select()
        .single();

      if (error) {
        console.error("Error creating booking:", error);
        throw error;
      }

      console.log("Booking created successfully:", data);

      // Add to shopping cart
      await addToCart({
        item_type: "airport_transfer",
        service_name: `Airport Transfer - ${formData.vehicleType}`,
        price: finalPrice,
        quantity: 1,
        details: {
          bookingId: data.id,
          codeBooking: formData.codeBooking,
          vehicleType: formData.vehicleType,
          fromAddress: formData.fromAddress,
          toAddress: formData.toAddress,
          pickupDate: formData.pickupDate,
          pickupTime: formData.pickupTime,
          distance: formData.distance.toString(),
          duration: formData.duration.toString(),
          passenger: formData.passenger,
          bookingType: bookingType,
          // ✅ Correct driver information from drivers table
          driverId: selectedVehicleDriver?.uuid || null, // ✅ UUID dari drivers.id
          id_driver: selectedVehicleDriver?.id_driver || null, // ✅ integer dari drivers.id_driver
          driverName: selectedVehicleDriver?.driver_name || "",
          driverPhone: selectedVehicleDriver?.driver_phone || "",
          vehicleName: selectedVehicleDriver
            ? `${selectedVehicleDriver.make} ${selectedVehicleDriver.model}`
            : "",
          vehicleModel: selectedVehicleDriver?.model || "",
          vehiclePlate: selectedVehicleDriver?.license_plate || "",
          vehicleMake: selectedVehicleDriver?.make || "",
        },
      });

      toast({
        title: "Booking Added to Cart",
        description:
          "Your airport transfer booking has been added to the cart.",
      });

      // Redirect to cart or success page
      navigate("/cart");
    } catch (error) {
      console.error("Error creating direct booking:", error);
      toast({
        title: "Booking Failed",
        description: "Could not create your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBooking(false);
    }
  };

  // Submit booking to database
  const handleSubmitBooking = async () => {
    setIsLoadingBooking(true);
    try {
      const bookingData = {
        id: uuidv4(), // Generate UUID for the id field
        code_booking: formData.codeBooking,
        customer_name: formData.fullName,
        phone: formData.phoneNumber,
        pickup_location: formData.fromAddress,
        dropoff_location: formData.toAddress,
        pickup_date: formData.pickupDate,
        pickup_time: formData.pickupTime,
        type: formData.vehicleType,
        price: formData.price,
        passenger: formData.passenger,
        driver_id: formData.driverId, // ✅ UUID, foreign key ke drivers.id
        id_driver: null, // ✅ Integer, ke kolom id_driver
        driver_name: formData.driverName,
        payment_method: formData.paymentMethod,
        distance: formData.distance.toString(),
        duration: formData.duration.toString(),
        license_plate: formData.vehiclePlate || "N/A",
        model: formData.vehicleModel || "N/A",
        make: formData.vehicleMake || "N/A",
        vehicle_name: formData.vehicleName || "N/A",
        status: "pending",
        customer_id: userId,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        //is_guest: !isAuthenticated || !userId, // Set is_guest flag based on auth status
      };

      const { data, error } = await supabase
        .from("airport_transfer")
        .insert([bookingData]);

      if (error) {
        throw error;
      }

      // Move to success step
      setCurrentStep(4);

      // Send WhatsApp message to customer
      const customerMessage = `🚗 Airport Transfer Booking Confirmed!

Booking Code: ${formData.bookingCode}
Driver: ${formData.driverName}
Vehicle: ${formData.vehicleName} (${formData.vehiclePlate})
Pickup: ${formData.fromAddress}
Dropoff: ${formData.toAddress}
Date & Time: ${bookingType === "instant" ? "Now" : `${new Date(formData.pickupDate).toLocaleDateString()} at ${formData.pickupTime}`}
Total Price: Rp ${formData.price.toLocaleString()}

Thank you for choosing our service!`;

      try {
        await sendWhatsAppMessage(formData.phoneNumber, customerMessage);
        console.log("WhatsApp message sent to customer successfully");
      } catch (whatsappError) {
        console.error(
          "Failed to send WhatsApp message to customer:",
          whatsappError,
        );
        // Don't show error to user since the booking was already saved
      }

      // Send WhatsApp message to driver if driver phone is available
      if (formData.driverPhone) {
        const driverMessage = `🚗 New Airport Transfer Booking!

Booking Code: ${formData.bookingCode}
Customer: ${formData.fullName}
Phone: ${formData.phoneNumber}
Pickup: ${formData.fromAddress}
Dropoff: ${formData.toAddress}
Date & Time: ${bookingType === "instant" ? "Now" : `${new Date(formData.pickupDate).toLocaleDateString()} at ${formData.pickupTime}`}
Passengers: ${formData.passenger}
Payment: ${formData.paymentMethod}

Please prepare for the trip!`;

        try {
          await sendWhatsAppMessage(formData.driverPhone, driverMessage);
          console.log("WhatsApp message sent to driver successfully");
        } catch (whatsappError) {
          console.error(
            "Failed to send WhatsApp message to driver:",
            whatsappError,
          );
          // Don't show error to user since the booking was already saved
        }
      }

      // Send notification (simulated)
      console.log("Sending booking notification to customer and driver");

      // Import the createBooking function to send data to external API
      import("../lib/bookingApi").then(async ({ createBooking }) => {
        try {
          const result = await createBooking(bookingData as any);
          console.log("External API booking result:", result);
        } catch (apiError) {
          console.error("Failed to send booking to external API:", apiError);
          // Don't show error to user since the booking was already saved in our database
        }
      });
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast({
        title: "Booking Failed",
        description: "Could not complete your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBooking(false);
    }
  };

  useEffect(() => {
    if (currentStep === 2) {
      searchDrivers(); // Re-search when vehicle type changes
    }
  }, [currentStep, formData.vehicleType]);

  // Use current location
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            const response = await fetch(
              `https://wvqlwgmlijtcutvseyey.functions.supabase.co/google-place-details`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  location: { lat, lng },
                  get_address_from_location: true,
                }),
              },
            );
            const data = await response.json();
            if (data.formatted_address) {
              setFormData((prev) => ({
                ...prev,
                fromLocation: [lat, lng],
                fromAddress: data.formatted_address,
              }));
              toast({
                title: "Location Found",
                description: "Using your current location as pickup point",
              });
            }
          } catch (error) {
            console.error("Error getting address from location:", error);
            toast({
              title: "Location Error",
              description: "Could not determine your address",
              variant: "destructive",
            });
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Access Denied",
            description: "Please enable location services to use this feature",
            variant: "destructive",
          });
        },
      );
    } else {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
    }
  };

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderLocationAndScheduleStep();
      case 2:
        return renderMapAndRouteWithDriverStep();
      case 3:
        return renderBookingConfirmationStep();
      case 4:
        return renderBookingSuccessStep();
      default:
        return renderLocationAndScheduleStep();
    }
  };

  // Add custom CSS for the routing machine
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-routing-container {
        display: none !important;
      }
      .leaflet-routing-alt {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Check if both locations are selected
  useEffect(() => {
    if (
      formData.fromAddress.trim() !== "" &&
      formData.toAddress.trim() !== ""
    ) {
      setLocationsSelected(true);
      // CRITICAL: Only trigger route calculation if not already calculated
      if (
        formData.fromLocation[0] !== 0 &&
        formData.toLocation[0] !== 0 &&
        !routeCalculated &&
        formData.distance === 0
      ) {
        console.log("🗺️ TRIGGERING ROUTE CALCULATION FROM LOCATIONS EFFECT:", {
          fromAddress: formData.fromAddress,
          toAddress: formData.toAddress,
          fromLocation: formData.fromLocation,
          toLocation: formData.toLocation,
          routeCalculated,
          currentDistance: formData.distance,
          timestamp: new Date().toISOString(),
        });
        getRouteDetails(formData.fromLocation, formData.toLocation);
      } else {
        console.log("🚫 SKIPPING ROUTE CALCULATION FROM LOCATIONS EFFECT:", {
          hasFromLocation: formData.fromLocation[0] !== 0,
          hasToLocation: formData.toLocation[0] !== 0,
          routeCalculated,
          currentDistance: formData.distance,
          reason: routeCalculated
            ? "Already calculated"
            : formData.distance > 0
              ? "Distance already set"
              : "Missing coordinates",
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      setLocationsSelected(false);
      setRouteCalculated(false); // Reset when locations are cleared
      console.log("🔄 LOCATIONS CLEARED - Resetting route calculation state");
    }
  }, [
    formData.fromAddress,
    formData.toAddress,
    formData.fromLocation,
    formData.toLocation,
    routeCalculated,
  ]);

  // Step 1: Location and Schedule
  const renderLocationAndScheduleStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Pickup & Dropoff Locations</h3>

          {/* Pickup Location */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-sm font-medium">Pickup Location</label>

              {/* Use My Location Option – responsif di mobile */}
              <div
                className="inline-flex items-center gap-1 bg-white border border-gray-300 rounded-md shadow-sm px-3 py-1 text-sm cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition"
                onClick={useCurrentLocation}
                onTouchStart={useCurrentLocation} // ✅ fix untuk mobile touch
              >
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>Use My Location</span>
              </div>
            </div>

            {/* Input field */}
            <div className="relative z-50">
              <AddressSearch
                label=""
                value={formData.fromAddress}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    fromAddress: value,
                    // Reset location if address is cleared
                    fromLocation: value ? prev.fromLocation : [0, 0],
                  }))
                }
                onSelectPosition={(pos) =>
                  setFormData((prev) => ({ ...prev, fromLocation: pos }))
                }
                placeholder="Enter pickup location"
              />
            </div>
          </div>

          {/* Dropoff Location */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-sm font-medium">Dropoff Location</label>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapLocation}
                className="h-8 px-2 w-max"
              >
                <ArrowRightLeft className="h-4 w-4 mr-1" />
                Swap
              </Button>
            </div>

            <div className="relative z-50">
              <AddressSearch
                label=""
                value={formData.toAddress}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    toAddress: value,
                    // Reset location if address is cleared
                    toLocation: value ? prev.toLocation : [0, 0],
                  }))
                }
                onSelectPosition={(pos) =>
                  setFormData((prev) => ({ ...prev, toLocation: pos }))
                }
                placeholder="Enter dropoff location"
              />
            </div>
          </div>
        </div>

        {/* Show map and booking type when both locations are selected */}
        {locationsSelected && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Route Preview</h3>

              <div className="bg-white rounded-md overflow-hidden border relative z-10 mt-4">
                <MapPicker
                  fromLocation={formData.fromLocation}
                  toLocation={formData.toLocation}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="text-center">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-500">
                        Distance
                      </h4>
                      <p className="text-lg sm:text-2xl font-bold">
                        {formData.distance > 0
                          ? formData.distance.toFixed(1)
                          : "0.0"}{" "}
                        km
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="text-center">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-500">
                        Duration
                      </h4>
                      <p className="text-lg sm:text-2xl font-bold">
                        {formData.duration > 0
                          ? formData.duration.toString()
                          : "0"}{" "}
                        min
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-base sm:text-lg font-medium mt-4 sm:mt-6">
                Booking Type
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div
                  className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${bookingType === "instant" ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
                  onClick={() => setBookingType("instant")}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 rounded-full border ${bookingType === "instant" ? "border-4 border-blue-500" : "border border-gray-300"}`}
                    ></div>
                    <div>
                      <span className="text-sm sm:text-base font-medium">
                        Instant Booking
                      </span>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Book for right now
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${bookingType === "scheduled" ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
                  onClick={() => setBookingType("scheduled")}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 rounded-full border ${bookingType === "scheduled" ? "border-4 border-blue-500" : "border border-gray-300"}`}
                    ></div>
                    <div>
                      <span className="text-sm sm:text-base font-medium">
                        Schedule Booking
                      </span>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Book for later
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Show vehicle types for both instant and scheduled booking */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-medium">
                  Available Vehicle Types
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {vehicleTypes.map((type) => {
                    // Calculate estimated price for this vehicle type using vehicle-specific pricing
                    const calculateEstimatedPrice = () => {
                      if (formData.distance <= 0) return 0;

                      // First try to get pricing from available vehicles with drivers for this type
                      const matchingVehicle = availableVehiclesWithDrivers.find(
                        (vehicle) =>
                          vehicle.vehicle_type === type.name ||
                          (type.name === "MPV" &&
                            vehicle.make &&
                            vehicle.model),
                      );

                      let priceKm, basicPrice, surcharge;

                      if (matchingVehicle) {
                        // Use pricing from actual available vehicle
                        priceKm = Number(matchingVehicle.price_km) || 0;
                        basicPrice = Number(matchingVehicle.basic_price) || 0;
                        surcharge = Number(matchingVehicle.surcharge) || 0;
                        console.log(
                          `Using vehicle-specific pricing for ${type.name} from ${matchingVehicle.make} ${matchingVehicle.model}`,
                        );
                      } else {
                        // Fallback to vehicle type pricing
                        priceKm = Number(type.price_per_km) || 0;
                        basicPrice = Number(type.basic_price) || 0;
                        surcharge = Number(type.surcharge) || 0;
                        console.log(
                          `Using vehicle type pricing for ${type.name}`,
                        );
                      }

                      // Validate pricing data
                      if (priceKm <= 0 || basicPrice <= 0) {
                        console.warn(`Invalid pricing data for ${type.name}:`, {
                          priceKm,
                          basicPrice,
                          surcharge,
                        });
                        return 0;
                      }

                      // Use the same calculatePrice function for consistency
                      const calculatedPrice = calculatePrice(
                        formData.distance,
                        priceKm,
                        basicPrice,
                        surcharge,
                      );

                      console.log(`Price calculation for ${type.name}:`, {
                        distance: formData.distance,
                        priceKm,
                        basicPrice,
                        surcharge,
                        calculatedPrice,
                        source: matchingVehicle
                          ? "vehicle-specific"
                          : "vehicle-type",
                      });

                      return calculatedPrice;
                    };

                    // Get icon based on vehicle type
                    const getVehicleIcon = () => {
                      switch (type.name.toLowerCase()) {
                        case "mpv":
                        case "mpv premium":
                          return <Car className="h-8 w-8" />;
                        case "electric":
                          return <Car className="h-8 w-8" />;
                        default:
                          return <Car className="h-8 w-8" />;
                      }
                    };

                    const isSelected = formData.vehicleType === type.name;

                    return (
                      <Card
                        key={type.name}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "hover:border-blue-500"
                        }`}
                        onClick={() => {
                          console.log(`🚗 Vehicle type ${type.name} selected`);

                          // Calculate price for consistency
                          const estimatedPrice = calculateEstimatedPrice();

                          // Find matching vehicle for consistent pricing
                          const matchingVehicle =
                            availableVehiclesWithDrivers.find(
                              (vehicle) =>
                                vehicle.vehicle_type === type.name ||
                                (type.name === "MPV" &&
                                  vehicle.make &&
                                  vehicle.model),
                            );

                          let finalPriceKm, finalBasicPrice, finalSurcharge;

                          // Use vehicle-specific pricing if available, otherwise use type pricing
                          if (matchingVehicle) {
                            finalPriceKm = matchingVehicle.price_km;
                            finalBasicPrice = matchingVehicle.basic_price;
                            finalSurcharge = matchingVehicle.surcharge;
                            console.log(
                              `✅ Using matching vehicle pricing for ${type.name}:`,
                              {
                                vehicle: `${matchingVehicle.make} ${matchingVehicle.model}`,
                                priceKm: finalPriceKm,
                                basicPrice: finalBasicPrice,
                                surcharge: finalSurcharge,
                              },
                            );
                          } else {
                            finalPriceKm = type.price_per_km;
                            finalBasicPrice = type.basic_price;
                            finalSurcharge = type.surcharge;
                            console.log(
                              `✅ Using vehicle type pricing for ${type.name}:`,
                              {
                                priceKm: finalPriceKm,
                                basicPrice: finalBasicPrice,
                                surcharge: finalSurcharge,
                              },
                            );
                          }

                          // Set the selected vehicle type and its pricing
                          setFormData((prev) => ({
                            ...prev,
                            vehicleType: type.name,
                            vehiclePricePerKm: finalPriceKm,
                            basicPrice: finalBasicPrice,
                            surcharge: finalSurcharge,
                            price: estimatedPrice,
                          }));

                          console.log(`💰 Vehicle type selection complete:`, {
                            name: type.name,
                            priceKm: finalPriceKm,
                            basicPrice: finalBasicPrice,
                            surcharge: finalSurcharge,
                            estimatedPrice,
                            distance: formData.distance,
                          });
                        }}
                      >
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1">
                              <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {/* Vehicle type specific images */}
                                <img
                                  src={(() => {
                                    switch (type.name.toLowerCase()) {
                                      case "mpv":
                                        return "https://travelintrips.co.id/wp-content/uploads/2025/07/Terios-Hitam-80.png?w=200&q=80&fit=crop&crop=center";
                                      case "mpv premium":
                                        return "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200&q=80&fit=crop&crop=center";
                                      case "electric":
                                        return "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=200&q=80&fit=crop&crop=center";
                                      case "sedan":
                                        return "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&q=80&fit=crop&crop=center";
                                      case "suv":
                                        return "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=200&q=80&fit=crop&crop=center";
                                      default:
                                        return "https://images.unsplash.com/photo-1549924231-f129b911e442?w=200&q=80&fit=crop&crop=center";
                                    }
                                  })()}
                                  alt={type.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to icon if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const iconDiv =
                                      target.nextElementSibling as HTMLElement;
                                    if (iconDiv) iconDiv.style.display = "flex";
                                  }}
                                />
                                {/* Fallback icon (hidden by default) */}
                                <div
                                  className="absolute inset-0 bg-blue-100 text-blue-600 flex items-center justify-center"
                                  style={{ display: "none" }}
                                >
                                  <Car className="h-5 w-5 sm:h-8 sm:w-8" />
                                </div>
                                {/* Vehicle type badge */}
                                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                                  {type.name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm sm:text-base font-medium">
                                  {type.name}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  {formData.distance > 0
                                    ? formData.distance.toFixed(1)
                                    : "0.0"}{" "}
                                  km •{" "}
                                  {formData.duration > 0
                                    ? formData.duration.toString()
                                    : "0"}{" "}
                                  min
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                              <p className="text-sm sm:text-base font-bold text-green-600">
                                {(() => {
                                  const price = calculateEstimatedPrice();
                                  return isNaN(price) || price <= 0
                                    ? "Calculating..."
                                    : `Rp ${Math.round(price).toLocaleString()}`;
                                })()}
                              </p>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Show available vehicles with drivers for instant booking */}
              {bookingType === "instant" && formData.vehicleType && (
                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-medium">
                    Available Vehicles & Drivers
                  </h3>

                  {isLoadingVehicles ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Loading available vehicles...</span>
                    </div>
                  ) : availableVehiclesWithDrivers.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                      {availableVehiclesWithDrivers.map((vehicle) => {
                        const calculateVehiclePrice = () => {
                          if (formData.distance <= 0) return 0;

                          // Ensure all values are numbers
                          const priceKm = Number(vehicle.price_km) || 0;
                          const basicPrice = Number(vehicle.basic_price) || 0;
                          const surcharge = Number(vehicle.surcharge) || 0;

                          // Validate pricing data
                          if (priceKm <= 0 || basicPrice <= 0) {
                            console.warn(
                              `Invalid vehicle pricing data for ${vehicle.make} ${vehicle.model}:`,
                              {
                                priceKm,
                                basicPrice,
                                surcharge,
                              },
                            );
                            return 0;
                          }

                          // Use the same calculatePrice function for consistency
                          const calculatedPrice = calculatePrice(
                            formData.distance,
                            priceKm,
                            basicPrice,
                            surcharge,
                          );

                          console.log(
                            `🚗 Vehicle price calculation for ${vehicle.make} ${vehicle.model}:`,
                            {
                              distance: formData.distance,
                              priceKm,
                              basicPrice,
                              surcharge,
                              calculatedPrice,
                              source: "vehicle_selection",
                            },
                          );

                          return calculatedPrice;
                        };

                        const isSelected =
                          selectedVehicleDriver?.uuid === vehicle.uuid;

                        return (
                          <Card
                            key={vehicle.id}
                            className={`cursor-pointer transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 shadow-md"
                                : "hover:shadow-md hover:border-blue-300"
                            }`}
                            onClick={() => {
                              console.log(
                                `🚗 Vehicle driver selected: ${vehicle.driver_name} - ${vehicle.make} ${vehicle.model}`,
                              );

                              // Calculate price using the same function for consistency
                              const calculatedPrice = calculateVehiclePrice();

                              // Set the selected vehicle and driver data
                              const vehicleData = {
                                id: vehicle.id, // Vehicle ID
                                uuid: vehicle.uuid, // ✅ Driver UUID from drivers.id
                                id_driver: vehicle.id_driver, // ✅ Driver integer ID from drivers.id_driver
                                driver_name: vehicle.driver_name,
                                driver_phone: vehicle.driver_phone,
                                make: vehicle.make,
                                model: vehicle.model,
                                license_plate: vehicle.license_plate,
                                price_km: vehicle.price_km,
                                basic_price: vehicle.basic_price,
                                surcharge: vehicle.surcharge,
                                calculated_price: calculatedPrice,
                              };

                              setSelectedVehicleDriver(vehicleData);

                              // CRITICAL: Lock the distance and duration to prevent recalculation
                              const currentDistance =
                                formData.distance > 0 ? formData.distance : 8.3;
                              const currentDuration =
                                formData.duration > 0 ? formData.duration : 10;

                              console.log(`🔒 LOCKING DISTANCE AND DURATION:`, {
                                selectedVehicle: `${vehicle.make} ${vehicle.model}`,
                                driver: vehicle.driver_name,
                                lockedDistance: currentDistance,
                                lockedDuration: currentDuration,
                                calculatedPrice,
                                timestamp: new Date().toISOString(),
                              });

                              setFormData((prev) => ({
                                ...prev,
                                driverId: vehicle.uuid, // ✅ Use driver UUID instead of vehicle ID
                                driverName: vehicle.driver_name,
                                driverPhone: vehicle.driver_phone,
                                vehicleName: `${vehicle.make} ${vehicle.model}`,
                                vehicleModel: vehicle.model,
                                vehiclePlate: vehicle.license_plate,
                                vehicleMake: vehicle.make,
                                vehiclePricePerKm: vehicle.price_km,
                                basicPrice: vehicle.basic_price,
                                surcharge: vehicle.surcharge,
                                price: calculatedPrice,
                                // CRITICAL: Lock distance and duration to prevent changes
                                distance: currentDistance,
                                duration: currentDuration,
                              }));

                              // CRITICAL: Mark route as calculated to prevent recalculation
                              setRouteCalculated(true);
                              console.log(
                                `🛑 ROUTE LOCKED - Distance: ${currentDistance}km, Duration: ${currentDuration}min`,
                              );

                              console.log(
                                `💰 Selected vehicle driver pricing updated:`,
                                {
                                  driver: vehicle.driver_name,
                                  vehicleName: `${vehicle.make} ${vehicle.model}`,
                                  priceKm: vehicle.price_km,
                                  basicPrice: vehicle.basic_price,
                                  surcharge: vehicle.surcharge,
                                  calculatedPrice,
                                  distance: formData.distance,
                                  formula: `${vehicle.basic_price} + (${formData.distance > 8 ? formData.distance - 8 : 0} × ${vehicle.price_km}) + ${vehicle.surcharge} = ${calculatedPrice}`,
                                },
                              );
                            }}
                          >
                            <CardContent className="pt-4 sm:pt-6">
                              <div className="space-y-3">
                                {/* Vehicle Info */}
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    {/* Try to load vehicle photo from database, fallback to placeholder */}
                                    <img
                                      src={
                                        vehicle.image ||
                                        `https://images.unsplash.com/photo-1549924231-f129b911e442?w=200&q=80&fit=crop&crop=center`
                                      }
                                      alt={`${vehicle.make} ${vehicle.model}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Fallback to different car images if the database image fails
                                        const target =
                                          e.target as HTMLImageElement;
                                        if (
                                          vehicle.image &&
                                          target.src === vehicle.image
                                        ) {
                                          // First fallback: generic car image
                                          target.src = `https://images.unsplash.com/photo-1549924231-f129b911e442?w=200&q=80&fit=crop&crop=center`;
                                        } else if (
                                          target.src.includes("1549924231")
                                        ) {
                                          target.src = `https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200&q=80&fit=crop&crop=center`;
                                        } else if (
                                          target.src.includes("1580273916")
                                        ) {
                                          target.src = `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&q=80&fit=crop&crop=center`;
                                        } else {
                                          // Final fallback: show icon
                                          target.style.display = "none";
                                          const iconDiv =
                                            target.nextElementSibling as HTMLElement;
                                          if (iconDiv)
                                            iconDiv.style.display = "flex";
                                        }
                                      }}
                                    />
                                    {/* Fallback icon (hidden by default) */}
                                    <div
                                      className="absolute inset-0 bg-blue-100 text-blue-600 flex items-center justify-center"
                                      style={{ display: "none" }}
                                    >
                                      <Car className="h-4 w-4 sm:h-6 sm:w-6" />
                                    </div>
                                    {/* Vehicle type badge */}
                                    <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                                      {vehicle.vehicle_type ||
                                        formData.vehicleType}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm sm:text-base font-semibold truncate">
                                      {vehicle.make} {vehicle.model}
                                    </h4>
                                    <p className="text-xs sm:text-sm text-gray-500">
                                      {vehicle.license_plate}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
                                  )}
                                </div>

                                {/* Driver Info */}
                                <div className="flex items-center gap-2 sm:gap-3 pl-7 sm:pl-11">
                                  <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-medium truncate">
                                      {vehicle.driver_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {vehicle.driver_phone}
                                    </p>
                                  </div>
                                </div>

                                {/* Price */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 border-t gap-1">
                                  <span className="text-xs sm:text-sm text-gray-600">
                                    Estimated Price:
                                  </span>
                                  <span className="text-sm sm:text-base font-bold text-green-600">
                                    {(() => {
                                      const price = calculateVehiclePrice();
                                      return isNaN(price) || price <= 0
                                        ? "Calculating..."
                                        : `Rp ${Math.round(price).toLocaleString()}`;
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-600 mb-2">
                        No Available Vehicles
                      </h4>
                      <p className="text-gray-500">
                        No {formData.vehicleType.toLowerCase()} vehicles with
                        assigned drivers are currently available.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-medium">Passengers</h3>

          {bookingType === "scheduled" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Pickup Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Pickup Date</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.pickupDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pickupDate: e.target.value,
                      }))
                    }
                    min={new Date().toISOString().split("T")[0]}
                    className="pl-8 sm:pl-10 text-sm sm:text-base"
                  />
                  <Calendar className="absolute left-2 sm:left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
              </div>

              {/* Pickup Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Pickup Time</label>
                <div className="relative">
                  <Input
                    type="time"
                    value={formData.pickupTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pickupTime: e.target.value,
                      }))
                    }
                    className="pl-8 sm:pl-10 text-sm sm:text-base"
                  />
                  <Clock className="absolute left-2 sm:left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {/* Passengers */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Passengers</label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.passenger}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      passenger: parseInt(e.target.value),
                    }))
                  }
                  className="pl-8 sm:pl-10 text-sm sm:text-base"
                />
                <Users className="absolute left-2 sm:left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 2: Vehicle Selection and Booking Confirmation
  const renderMapAndRouteWithDriverStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Route Preview</h3>

          <div className="bg-white rounded-md overflow-hidden border relative z-10">
            <MapPicker
              fromLocation={formData.fromLocation}
              toLocation={formData.toLocation}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-500">
                    Distance
                  </h4>
                  <p className="text-2xl font-bold">
                    {formData.distance.toFixed(1)} km
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-500">
                    Duration
                  </h4>
                  <p className="text-2xl font-bold">
                    {formData.duration.toString()} min
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-500">
                    Estimated Price
                  </h4>
                  <p className="text-2xl font-bold text-green-600">
                    {isNaN(formData.price) || formData.price <= 0
                      ? "Price calculating..."
                      : `Rp ${Math.round(formData.price).toLocaleString()}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-700">Route Details</h4>
            <div className="mt-2 space-y-2">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                </div>
                <div>
                  <p className="font-medium">Pickup</p>
                  <p className="text-sm text-gray-600">
                    {formData.fromAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="h-4 w-4 rounded-full bg-red-500"></div>
                </div>
                <div>
                  <p className="font-medium">Dropoff</p>
                  <p className="text-sm text-gray-600">{formData.toAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-gray-700 mb-3">Booking Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Vehicle Type:</span>
                <span className="font-medium text-right">
                  {formData.vehicleType}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span className="font-medium">
                  {bookingType === "instant"
                    ? "Now"
                    : `${new Date(formData.pickupDate).toLocaleDateString()} at ${formData.pickupTime}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Passengers:</span>
                <span className="font-medium">{formData.passenger}</span>
              </div>
              {selectedVehicleDriver && (
                <>
                  <div className="flex justify-between">
                    <span>Selected Driver:</span>
                    <span className="font-medium">
                      {selectedVehicleDriver.driver_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vehicle:</span>
                    <span className="font-medium">
                      {selectedVehicleDriver.make} {selectedVehicleDriver.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>License Plate:</span>
                    <span className="font-medium">
                      {selectedVehicleDriver.license_plate}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>Distance:</span>
                <span className="font-medium">
                  {formData.distance.toFixed(1)} km
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">
                  {formData.duration.toString()} min
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Total Price:</span>
                <span className="font-bold text-lg">
                  {isNaN(formData.price) || formData.price <= 0
                    ? "Price calculating..."
                    : `Rp ${Math.round(formData.price).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 3: Driver Selection
  const renderDriverSelectionStep = () => {
    return (
      <div className="space-y-6">
        {/* Vehicle Type */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Vehicle Type</h3>
          <select
            value={formData.vehicleType}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                vehicleType: e.target.value,
              }))
            }
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoadingBooking || vehicleTypes.length === 0}
          >
            {vehicleTypes.length > 0 ? (
              vehicleTypes.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.name}
                </option>
              ))
            ) : (
              <option value="">Loading vehicle types...</option>
            )}
          </select>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Available Drivers</h3>

          {isSearchingDriver ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-500">
                Searching for available drivers...
              </p>
            </div>
          ) : availableDrivers.length > 0 ? (
            <div className="space-y-4">
              {availableDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedDriver?.id === driver.id ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
                  onClick={() => handleSelectDriver(driver)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
                      {driver.photo_url ? (
                        <img
                          src={driver.photo_url}
                          alt={driver.driver_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-500">
                          <Users className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        {driver.driver_name}
                        {driver.vehicle_type && (
                          <span className="text-xs font-medium text-white px-2 py-0.5 rounded bg-gray-700">
                            {driver.vehicle_type}
                          </span>
                        )}
                      </h4>

                      <p className="text-sm text-gray-500">
                        {driver.phone_number}
                      </p>

                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {/* Status */}
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {driver.status === "onride" ? "On Ride" : "Available"}
                        </span>

                        {/* Detail kendaraan */}
                        <span className="text-xs text-gray-500">
                          {driver.id_driver !== undefined &&
                          driver.id_driver !== null &&
                          driver.id_driver !== 0
                            ? `ID ${driver.id_driver}`
                            : driver.id !== undefined && driver.id !== null
                              ? `ID ${driver.id}`
                              : "ID Unknown"}{" "}
                          {/* 👈 improved fallback for ID */}
                          {driver.vehicle_model && ` • ${driver.vehicle_model}`}
                          {driver.license_plate && ` • ${driver.license_plate}`}
                          {driver.vehicle_color && (
                            <span className="ml-1 text-xs text-gray-700 font-semibold">
                              {driver.vehicle_color}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {driver.distance} km away
                      </div>
                      <div className="text-xs text-gray-500">
                        ETA: {driver.eta} min
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <div className="flex flex-col items-center">
                <Car className="h-12 w-12 text-yellow-500 mb-4" />
                <h4 className="text-lg font-medium mb-2">No drivers found</h4>
                <p className="text-gray-600 mb-4">
                  We couldn't find any available drivers at the moment.
                </p>
                <Button onClick={searchDrivers}>Try Again</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Step 4: Booking Confirmation
  const renderBookingConfirmationStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Personal Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    phoneNumber: e.target.value,
                  }))
                }
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Booking Summary</h3>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pickup</span>
                  <span className="font-medium text-right">
                    {formData.fromAddress}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Dropoff</span>
                  <span className="font-medium text-right">
                    {formData.toAddress}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Date & Time</span>
                  <span className="font-medium">
                    {bookingType === "instant"
                      ? "Now"
                      : `${new Date(formData.pickupDate).toLocaleDateString()} at ${formData.pickupTime}`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Driver</span>
                  <span className="font-medium">{formData.driverName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle Model</span>
                  <span className="font-medium">{formData.vehicleModel}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle Type</span>
                  <span className="font-medium">{formData.vehicleType}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Plate Number</span>
                  <span className="font-medium">
                    {formData.vehiclePlate || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle Color</span>
                  <span className="font-medium">
                    {formData.vehicleColor || "Unknown"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Passengers</span>
                  <span className="font-medium">{formData.passenger}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Surcharge</span>
                  <span className="font-medium">
                    Rp {formData.surcharge?.toLocaleString()}
                  </span>
                </div>

                {/*    <div className="flex justify-between">
                  <span className="text-gray-500">Parking</span>
                  <span className="font-medium">
                    Rp {formData.parking?.toLocaleString() || "10,000"}
                  </span>
                </div> */}

                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Price</span>
                    <span className="font-bold text-lg">
                      {isNaN(formData.price) || formData.price <= 0
                        ? "Price calculating..."
                        : `Rp ${Math.round(formData.price).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Payment Method</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.paymentMethod === "cash" ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
              onClick={() =>
                setFormData((prev) => ({ ...prev, paymentMethod: "cash" }))
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded-full border ${formData.paymentMethod === "cash" ? "border-4 border-blue-500" : "border border-gray-300"}`}
                ></div>
                <span>Cash</span>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.paymentMethod === "qris" ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
              onClick={() =>
                setFormData((prev) => ({ ...prev, paymentMethod: "qris" }))
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded-full border ${formData.paymentMethod === "qris" ? "border-4 border-blue-500" : "border border-gray-300"}`}
                ></div>
                <span>QRIS / E-wallet</span>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.paymentMethod === "transfer" ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}`}
              onClick={() =>
                setFormData((prev) => ({ ...prev, paymentMethod: "transfer" }))
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded-full border ${formData.paymentMethod === "transfer" ? "border-4 border-blue-500" : "border border-gray-300"}`}
                ></div>
                <span>Bank Transfer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 5: Booking Success
  const renderBookingSuccessStep = () => {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="bg-green-100 rounded-full p-4 mb-6">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>

        <h2 className="text-2xl font-bold mb-2">Booking Successful!</h2>
        <p className="text-gray-600 mb-6 text-center">
          Your airport transfer has been booked successfully.
        </p>

        <div className="bg-gray-50 w-full max-w-md rounded-lg p-6 mb-8">
          <div className="text-center mb-4">
            <h3 className="text-sm font-medium text-gray-500">
              Booking Reference
            </h3>
            <p className="text-xl font-bold">{formData.bookingCode}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Date & Time</span>
              <span className="font-medium">
                {bookingType === "instant"
                  ? "Now"
                  : `${new Date(formData.pickupDate).toLocaleDateString()} at ${formData.pickupTime}`}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Driver</span>
              <span className="font-medium">
                {formData.driverName || "Not selected"}
              </span>
            </div>

            {formData.driverPhone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Driver Phone</span>
                <span className="font-medium">{formData.driverPhone}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-500">Vehicle</span>
              <span className="font-medium">{formData.vehicleName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Payment</span>
              <span className="font-medium capitalize">
                {formData.paymentMethod}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate(`/booking/${formData.bookingCode}`)}
          >
            <Car className="h-4 w-4" />
            Track Booking
          </Button>

          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() =>
              (window.location.href = `tel:${formData.driverPhone}`)
            }
          >
            <Phone className="h-4 w-4" />
            Call Driver
          </Button>

          <Button
            className="flex items-center gap-2"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-500 to-blue-700">
      {/* Header with back button - Mobile optimized */}
      <header className="p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="bg-white/90 hover:bg-white text-sm sm:text-base w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
        <div className="flex gap-2 w-full sm:w-auto justify-center">
          <Button
            variant="outline"
            className="bg-white/90 hover:bg-white text-sm px-3 py-2"
          >
            IDR
          </Button>
          <Button
            variant="outline"
            className="bg-white/90 hover:bg-white flex items-center gap-1 text-sm px-3 py-2"
          >
            <img
              src="https://flagcdn.com/w20/gb.png"
              alt="English"
              className="h-3 sm:h-4"
            />
            EN
          </Button>
        </div>
      </header>

      {/* Hero section - Mobile optimized */}
      <div className="text-center text-white px-3 sm:px-4 py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 leading-tight">
          {t("airportTransfer.title", "Airport transfers made")}
        </h1>
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-4 leading-tight">
          {t("airportTransfer.subtitle", "surprisingly easy and enjoyable!")}
        </h2>
      </div>

      {/* Main content - Mobile optimized */}
      <div className="mx-auto w-full max-w-5xl px-2 sm:px-4 pb-4 sm:pb-8 flex-1 flex flex-col">
        <Card className="w-full shadow-lg">
          <CardHeader className="p-3 sm:p-6">
            <div className="w-full">
              {/* Progress bar */}
              <div className="mb-3 sm:mb-4">
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {/* Step indicators - Mobile responsive */}
              <div className="flex justify-between px-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex flex-col items-center ${currentStep >= step ? "text-blue-600" : "text-gray-400"}`}
                  >
                    <div
                      className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${currentStep >= step ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}
                    >
                      {step}
                    </div>
                    <span className="text-xs mt-1 hidden sm:block text-center">
                      {step === 1 && "Location"}
                      {step === 2 && "Route & Driver"}
                      {step === 3 && "Confirm"}
                      {step === 4 && "Success"}
                    </span>
                    {/* Mobile step labels */}
                    <span className="text-xs mt-1 block sm:hidden text-center leading-tight">
                      {step === 1 && "Loc"}
                      {step === 2 && "Route"}
                      {step === 3 && "Conf"}
                      {step === 4 && "Done"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-6">
            {renderStepContent()}
          </CardContent>

          {currentStep < 4 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 p-3 sm:p-6">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={isLoadingBooking}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Back
                </Button>
              ) : (
                <div className="hidden sm:block"></div>
              )}

              <Button
                onClick={handleNextStep}
                disabled={!isCurrentStepValid() || isLoadingBooking}
                className="min-w-[100px] w-full sm:w-auto order-1 sm:order-2"
              >
                {isLoadingBooking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">
                      {currentStep === 2 ? "Adding to Cart..." : "Loading..."}
                    </span>
                    <span className="sm:hidden">
                      {currentStep === 2 ? "Adding..." : "Loading..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      {currentStep === 2 ? "Confirm & Add to Cart" : "Next"}
                    </span>
                    <span className="sm:hidden">
                      {currentStep === 2 ? "Add to Cart" : "Next"}
                    </span>
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AirportTransferPage() {
  return (
    <TooltipProvider>
      <LoadScriptNext
        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
        libraries={GOOGLE_MAPS_LIBRARIES}
      >
        <AirportTransferPageContent />
      </LoadScriptNext>
    </TooltipProvider>
  );
}
