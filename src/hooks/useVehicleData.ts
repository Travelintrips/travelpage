import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Vehicle {
  id: string;
  name: string;
  type: "sedan" | "suv" | "truck" | "luxury";
  price: number;
  image: string;
  seats: number;
  transmission: "automatic" | "manual";
  fuelType: "petrol" | "diesel" | "electric" | "hybrid";
  available: boolean;
  features: string[];
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  vehicle_type_id?: number;
  vehicle_type_name?: string;
}

interface CarModel {
  modelName: string;
  availableCount: number;
  imageUrl: string;
  vehicles: Vehicle[];
}

export function useVehicleData(modelNameParam?: string) {
  const [carModels, setCarModels] = useState<CarModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  const fetchVehicles = async (forceRefetch = false, retryCount = 0) => {
    if (isFetching && !forceRefetch) {
      console.log("[useVehicleData] Already fetching, skipping...");
      return;
    }

    console.log("[useVehicleData] Fetching vehicles...", {
      forceRefetch,
      retryCount,
    });
    setIsFetching(true);
    setFetchAttempted(true);
    setIsLoadingModels(true);
    setError(null);

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      // Fetch vehicle data with timeout
      let query = supabase.from("vehicles").select("*");

      if (typeof query.order === "function") {
        query = query.order("make");
      }

      const { data, error } = await query;
      clearTimeout(timeoutId);

      if (error) {
        console.error("Error fetching vehicles:", error);

        // Retry logic for failed requests
        if (retryCount < 2) {
          console.log(
            `[useVehicleData] Retrying fetch (attempt ${retryCount + 1})`,
          );
          setTimeout(
            () => {
              fetchVehicles(forceRefetch, retryCount + 1);
            },
            1000 * (retryCount + 1),
          ); // Exponential backoff
          return;
        }

        setError("Failed to load vehicles. Please try again later.");
        setCarModels([]);
        return;
      }

      console.log(
        "[useVehicleData] Vehicles data received:",
        data ? data.length : 0,
        "vehicles",
      );

      if (!data || data.length === 0) {
        console.log("[useVehicleData] No vehicles found in database");
        setCarModels([]);
        setHasInitialLoad(true);
        return;
      }

      // Group by model
      const groupedByModel = data.reduce((acc, vehicle) => {
        const modelKey = `${vehicle.make || ""} ${vehicle.model || ""}`.trim();

        if (!acc[modelKey]) {
          acc[modelKey] = {
            modelName: modelKey,
            availableCount: 0,
            imageUrl:
              vehicle.image ||
              `/images/cover/${modelKey.toLowerCase().replace(/\s+/g, "-")}.jpg`,
            vehicles: [],
          };
        }

        const transformedVehicle = {
          id: vehicle.id.toString(),
          name: modelKey || "Unknown Vehicle",
          type: vehicle.type || "sedan",
          price: vehicle.price || 0,
          image:
            vehicle.image ||
            "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
          seats: vehicle.seats || 4,
          transmission: vehicle.transmission || "automatic",
          fuelType: vehicle.fuel_type || "petrol",
          available: vehicle.available !== false,
          features: vehicle.features
            ? typeof vehicle.features === "string"
              ? JSON.parse(vehicle.features)
              : Array.isArray(vehicle.features)
                ? vehicle.features
                : ["AC"]
            : ["AC"],
          vehicle_type_id: vehicle.vehicle_type_id,
          vehicle_type_name: vehicle.vehicle_type_name,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          license_plate: vehicle.license_plate,
        };

        acc[modelKey].vehicles.push(transformedVehicle);

        if (vehicle.available !== false) {
          acc[modelKey].availableCount += 1;
        }

        return acc;
      }, {});

      const modelsArray = Object.values(groupedByModel) as CarModel[];
      setCarModels(modelsArray);
      setHasInitialLoad(true);

      // If modelName exists in URL, find and select the model
      if (modelNameParam) {
        const decodedModelName = decodeURIComponent(modelNameParam);
        const foundModel = modelsArray.find((model) => {
          const normalizedModelName = model.modelName.toLowerCase().trim();
          const normalizedUrlName = decodedModelName.toLowerCase().trim();

          const furtherNormalizedModelName = normalizedModelName.replace(
            /\s+/g,
            " ",
          );
          const furtherNormalizedUrlName = normalizedUrlName.replace(
            /\s+/g,
            " ",
          );

          return furtherNormalizedModelName === furtherNormalizedUrlName;
        });

        if (foundModel) {
          setSelectedModel(foundModel);
        } else {
          console.log(
            `[useVehicleData] No model found matching: "${decodedModelName}"`,
          );
        }
      }
    } catch (error) {
      console.error("[useVehicleData] Error processing vehicles data:", error);

      // Check if it's an abort error (timeout)
      if (error.name === "AbortError") {
        console.warn("[useVehicleData] Request was aborted due to timeout");
        setError(
          "Request timed out. Please check your connection and try again.",
        );
      } else {
        setError("An error occurred while processing vehicle data.");
      }

      // Retry logic for network errors
      if (retryCount < 2 && error.name !== "AbortError") {
        console.log(
          `[useVehicleData] Retrying after error (attempt ${retryCount + 1})`,
        );
        setTimeout(
          () => {
            fetchVehicles(forceRefetch, retryCount + 1);
          },
          2000 * (retryCount + 1),
        ); // Exponential backoff
        return;
      }

      setHasInitialLoad(true);
    } finally {
      setIsLoadingModels(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Only fetch if we haven't attempted yet or if shouldRefetch changed
    if (!fetchAttempted || shouldRefetch > 0) {
      // Add a timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        if (!hasInitialLoad && isMounted) {
          console.log(
            "[useVehicleData] Loading timeout reached, forcing load completion",
          );
          setIsLoadingModels(false);
          setHasInitialLoad(true);
          setIsFetching(false);
        }
      }, 10000); // 10 second timeout

      if (isMounted) {
        fetchVehicles();
      }

      return () => {
        isMounted = false;
        clearTimeout(loadingTimeout);
      };
    } else {
      // If we've already fetched and no refetch is needed, ensure loading is false
      if (fetchAttempted && hasInitialLoad && isLoadingModels) {
        console.log(
          "[useVehicleData] Fetch already attempted, setting loading to false",
        );
        setIsLoadingModels(false);
      }
    }
  }, [
    modelNameParam,
    shouldRefetch,
    fetchAttempted,
    hasInitialLoad,
    isLoadingModels,
  ]);

  // Enhanced visibility change listener with better retry logic
  useEffect(() => {
    let hasFetched = false;
    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        hasInitialLoad &&
        !isFetching &&
        !hasFetched
      ) {
        console.log(
          "[useVehicleData] Tab became visible, checking for vehicle updates",
        );
        hasFetched = true;

        // Clear any existing timeout
        if (visibilityTimeout) clearTimeout(visibilityTimeout);

        // Small delay to ensure any auth changes are processed
        visibilityTimeout = setTimeout(() => {
          if (!isFetching) {
            // Check if we have data, if not, force refetch
            if (carModels.length === 0 || error) {
              console.log(
                "[useVehicleData] No data or error detected, forcing refetch",
              );
              fetchVehicles(true); // Force refetch
            } else {
              console.log("[useVehicleData] Triggering visibility refetch");
              setShouldRefetch((prev) => prev + 1);
            }
          }

          // Reset flag after a delay to allow future visibility changes
          setTimeout(() => {
            hasFetched = false;
          }, 3000);
        }, 300);
      }
    };

    // Listen for custom auth refresh events
    const handleAuthRefresh = () => {
      console.log(
        "[useVehicleData] Auth state refreshed, checking if refetch needed",
      );
      if (carModels.length === 0 && !isFetching) {
        console.log(
          "[useVehicleData] No vehicles loaded, triggering refetch after auth refresh",
        );
        setTimeout(() => {
          fetchVehicles(true);
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("authStateRefreshed", handleAuthRefresh);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("authStateRefreshed", handleAuthRefresh);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [hasInitialLoad, isFetching, carModels.length, error]);

  const refetchVehicleData = () => {
    console.log("[useVehicleData] Triggering refetch...");
    if (!isFetching) {
      setFetchAttempted(false);
      setShouldRefetch((prev) => prev + 1);
    } else {
      console.log("[useVehicleData] Skipping refetch - already fetching");
    }
  };

  return {
    carModels,
    isLoadingModels,
    selectedModel,
    setSelectedModel,
    error,
    refetchVehicleData,
    hasInitialLoad,
  };
}
