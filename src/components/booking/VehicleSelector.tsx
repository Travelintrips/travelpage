import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Car,
  Truck,
  Zap,
  Users,
  Fuel,
  Calendar,
  Loader2,
  Tag,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

interface VehicleType {
  id: number;
  name: string;
  created_at?: string;
}

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
  vehicle_type_id?: number;
  vehicle_type_name?: string;
  license_plate?: string;
}

interface VehicleSelectorProps {
  onSelectVehicle?: (vehicle: Vehicle) => void;
  availableVehicles?: Vehicle[];
}

const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  onSelectVehicle = () => {},
  availableVehicles = [],
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 2000000]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<
    number | null
  >(null);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isLoadingVehicleTypes, setIsLoadingVehicleTypes] = useState(false);

  // Fetch vehicle types from Supabase
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        setIsLoadingVehicleTypes(true);
        const { data, error } = await supabase
          .from("vehicle_types")
          .select("*")
          .order("name");

        if (error) {
          console.error("Error fetching vehicle types:", error);
          return;
        }

        setVehicleTypes(data || []);
      } catch (error) {
        console.error("Error processing vehicle types data:", error);
      } finally {
        setIsLoadingVehicleTypes(false);
      }
    };

    fetchVehicleTypes();
  }, []);

  // Fetch vehicles from Supabase if no vehicles are provided
  useEffect(() => {
    // Only fetch if we don't have vehicles already
    if (availableVehicles.length > 0) {
      setVehicles(availableVehicles);
      setIsLoading(false);
      return;
    }

    // Set loading state and fetch data
    setIsLoading(true);

    const fetchVehicles = async () => {
      try {
        // Add pagination with smaller limit and use simpler query
        const { data, error } = await supabase
          .from("vehicles")
          .select(
            `
    id, make, model, type, price, image, seats, transmission, fuel_type, available, features, license_plate, vehicle_type_id, is_with_driver,
    vehicle_types(id, name)
  `,
          )

          .limit(10);

        if (error) {
          console.error("Error fetching vehicles:", error);
          setVehicles([]);
          setIsLoading(false);
          return;
        }

        // If no data is found, just set an empty array
        if (!data || data.length === 0) {
          setVehicles([]);
          setIsLoading(false);
          return;
        }

        // Transform the data to match the Vehicle interface
        const transformedData: Vehicle[] = data.map((car) => {
          // Extract vehicle type data if available
          const vehicleTypeData = car.vehicle_types as {
            id: number;
            name: string;
          } | null;

          return {
            id: car.id.toString(),
            name:
              `${car.make || ""} ${car.model || ""}`.trim() ||
              "Unknown Vehicle",
            type: (car.type as any) || "sedan",
            price: car.price || 0,
            image:
              car.image ||
              "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
            seats: car.seats || 4,
            transmission: (car.transmission as any) || "automatic",
            fuelType: (car.fuel_type as any) || "petrol",
            available: car.available !== false,
            features: car.features
              ? typeof car.features === "string"
                ? JSON.parse(car.features)
                : Array.isArray(car.features)
                  ? car.features
                  : ["AC"]
              : ["AC"],
            vehicle_type_id: car.vehicle_type_id,
            vehicle_type_name: vehicleTypeData
              ? vehicleTypeData.name
              : undefined,
            license_plate: car.license_plate || "",
          };
        });

        setVehicles(transformedData);
      } catch (error) {
        console.error("Error processing vehicles data:", error);
        setVehicles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicles();

    // No dependencies to prevent re-fetching
  }, []);

  // Filter vehicles based on search, price range, type, and vehicle type ID
  const filterVehicles = React.useCallback(() => {
    let filtered = [...vehicles];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((vehicle) =>
        vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filter by price range
    filtered = filtered.filter(
      (vehicle) =>
        vehicle.price >= priceRange[0] && vehicle.price <= priceRange[1],
    );

    // Filter by vehicle type
    if (selectedType !== "all") {
      filtered = filtered.filter((vehicle) => vehicle.type === selectedType);
    }

    // Filter by vehicle type ID
    if (selectedVehicleTypeId !== null) {
      filtered = filtered.filter(
        (vehicle) => vehicle.vehicle_type_id === selectedVehicleTypeId,
      );
    }

    setFilteredVehicles(filtered);
  }, [vehicles, searchTerm, priceRange, selectedType, selectedVehicleTypeId]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle price range change
  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange(value);
  };

  // Handle vehicle type selection
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
  };

  // Handle vehicle type ID selection
  const handleVehicleTypeChange = (value: string) => {
    setSelectedVehicleTypeId(value === "all" ? null : parseInt(value));
  };

  // Apply filters when any filter changes or when vehicles change
  React.useEffect(() => {
    if (vehicles.length > 0) {
      filterVehicles();
    }
  }, [searchTerm, priceRange, selectedType, selectedVehicleTypeId, vehicles]);

  // Format price to IDR
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Get vehicle type icon
  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case "sedan":
        return <Car className="h-5 w-5" />;
      case "suv":
        return <Car className="h-5 w-5" />;
      case "truck":
        return <Truck className="h-5 w-5" />;
      case "luxury":
        return <Car className="h-5 w-5" />;
      default:
        return <Car className="h-5 w-5" />;
    }
  };

  // Get fuel type icon
  const getFuelTypeIcon = (fuelType: string) => {
    switch (fuelType) {
      case "electric":
        return <Zap className="h-4 w-4" />;
      default:
        return <Fuel className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-64 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("vehicleSelector.searchPlaceholder")}
              className="pl-8"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {t("vehicleSelector.priceRange")}
                </label>
                <span className="text-xs text-muted-foreground">
                  {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                </span>
              </div>
              <Slider
                defaultValue={[0, 2000000]}
                min={0}
                max={2000000}
                step={50000}
                value={priceRange}
                onValueChange={handlePriceRangeChange}
                className="mt-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("vehicleSelector.vehicleType")}
              </label>
              <Tabs
                value={selectedType}
                onValueChange={handleTypeChange}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 h-auto">
                  <TabsTrigger value="all" className="text-xs py-1.5">
                    {t("vehicleSelector.allTypes")}
                  </TabsTrigger>
                  <TabsTrigger value="sedan" className="text-xs py-1.5">
                    {t("vehicleSelector.sedan")}
                  </TabsTrigger>
                  <TabsTrigger value="suv" className="text-xs py-1.5">
                    {t("vehicleSelector.suv")}
                  </TabsTrigger>
                  <TabsTrigger value="luxury" className="text-xs py-1.5">
                    {t("vehicleSelector.luxury")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Tag className="h-4 w-4 mr-1" />
                {t("vehicleSelector.vehicleTypeCategory", "Vehicle Category")}
              </label>
              <Select
                value={
                  selectedVehicleTypeId === null
                    ? "all"
                    : selectedVehicleTypeId.toString()
                }
                onValueChange={handleVehicleTypeChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t(
                      "vehicleSelector.selectVehicleType",
                      "Select vehicle category",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("vehicleSelector.allCategories", "All Categories")}
                  </SelectItem>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2">{t("vehicleSelector.loading")}</span>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Car className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">
                {t("vehicleSelector.noVehicles")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("vehicleSelector.adjustFilters")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className={`overflow-hidden transition-all hover:shadow-md ${!vehicle.available ? "opacity-60" : ""}`}
                >
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={vehicle.image}
                      alt={vehicle.name}
                      className="h-full w-full object-cover transition-all hover:scale-105"
                    />
                  </div>
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {vehicle.name}
                        </CardTitle>
                        {vehicle.license_plate && (
                          <div className="inline-block bg-gray-100 text-gray-800 text-m font-bold px-2 py-0.5 rounded-md mb-1">
                            {vehicle.license_plate}
                          </div>
                        )}

                        <div className="flex items-center mt-1">
                          {getVehicleTypeIcon(vehicle.type)}
                          <span className="text-xs text-muted-foreground ml-1 capitalize">
                            {vehicle.type}
                          </span>
                          {vehicle.vehicle_type_name && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {vehicle.vehicle_type_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={vehicle.available ? "default" : "outline"}
                        className={vehicle.available ? "bg-green-500" : ""}
                      >
                        {vehicle.available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center">
                        <Users className="h-3.5 w-3.5 mr-1" />
                        {vehicle.seats} {t("vehicleSelector.seats")}
                      </span>
                      <span className="text-muted-foreground flex items-center">
                        {getFuelTypeIcon(vehicle.fuelType)}
                        <span className="ml-1 capitalize">
                          {vehicle.fuelType}
                        </span>
                      </span>
                      <span className="text-muted-foreground flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        <span className="capitalize">
                          {vehicle.transmission}
                        </span>
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="flex flex-wrap gap-1">
                        {vehicle.features.slice(0, 3).map((feature, index) => (
                          <Badge
                            variant="secondary"
                            key={index}
                            className="text-xs"
                          >
                            {feature}
                          </Badge>
                        ))}
                        {vehicle.features.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{vehicle.features.length - 3}{" "}
                            {t("vehicleSelector.more")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <Separator />
                  <CardFooter className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-lg">
                        {formatPrice(vehicle.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("vehicleSelector.perDay")}
                      </p>
                    </div>
                    <Button
                      onClick={() => onSelectVehicle(vehicle)}
                      disabled={!vehicle.available}
                    >
                      {vehicle.available
                        ? t("vehicleSelector.select")
                        : t("vehicleSelector.unavailable")}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleSelector;
