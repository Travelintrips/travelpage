import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Save, RefreshCw } from "lucide-react";

interface VehiclePrice {
  id: string;
  type: string;
  price_km: number;
  original_price_km: number;
  basic_price: number;
  original_basic_price: number;
  surcharge: string;
  original_surcharge: string;
}

interface VehicleTypePrice {
  type: string;
  price_km: number;
  original_price_km: number;
  basic_price: number;
  original_basic_price: number;
  surcharge: string;
  original_surcharge: string;
  vehicleIds: string[];
}

const PriceKMManagement = () => {
  const [vehicles, setVehicles] = useState<VehiclePrice[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypePrice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("mpv");

  // Fetch vehicles data
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, type, price_km, basic_price, surcharge")
        .order("type", { ascending: true });

      if (error) throw error;

      // Transform data to include original prices and surcharge for comparison
      const transformedData = data.map((vehicle) => ({
        ...vehicle,
        original_price_km: vehicle.price_km,
        original_basic_price: vehicle.basic_price || 0,
        surcharge: vehicle.surcharge || "",
        original_surcharge: vehicle.surcharge || "",
      }));

      setVehicles(transformedData);

      // Group vehicles by type and get a single price for each type
      const groupedByType = transformedData.reduce((acc, vehicle) => {
        const existingType = acc.find((item) => item.type === vehicle.type);

        if (existingType) {
          existingType.vehicleIds.push(vehicle.id);
        } else {
          acc.push({
            type: vehicle.type,
            price_km: vehicle.price_km,
            original_price_km: vehicle.price_km,
            basic_price: vehicle.basic_price || 0,
            original_basic_price: vehicle.basic_price || 0,
            surcharge: vehicle.surcharge || "",
            original_surcharge: vehicle.surcharge || "",
            vehicleIds: [vehicle.id],
          });
        }

        return acc;
      }, [] as VehicleTypePrice[]);

      setVehicleTypes(groupedByType);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast({
        title: "Error",
        description: "Failed to load vehicle prices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Handle price change for a vehicle type
  const handleTypePriceChange = (type: string, newPrice: number) => {
    // Update the price for the vehicle type
    setVehicleTypes((prev) =>
      prev.map((vehicleType) =>
        vehicleType.type === type
          ? { ...vehicleType, price_km: newPrice }
          : vehicleType,
      ),
    );

    // Also update all vehicles of this type
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.type === type ? { ...vehicle, price_km: newPrice } : vehicle,
      ),
    );
  };

  // Handle basic price change for a vehicle type
  const handleTypeBasicPriceChange = (type: string, newBasicPrice: number) => {
    // Update the basic price for the vehicle type
    setVehicleTypes((prev) =>
      prev.map((vehicleType) =>
        vehicleType.type === type
          ? { ...vehicleType, basic_price: newBasicPrice }
          : vehicleType,
      ),
    );

    // Also update all vehicles of this type
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.type === type
          ? { ...vehicle, basic_price: newBasicPrice }
          : vehicle,
      ),
    );
  };

  // Handle surcharge change for a vehicle type
  const handleTypeSurchargeChange = (type: string, newSurcharge: string) => {
    // Update the surcharge for the vehicle type
    setVehicleTypes((prev) =>
      prev.map((vehicleType) =>
        vehicleType.type === type
          ? { ...vehicleType, surcharge: newSurcharge }
          : vehicleType,
      ),
    );

    // Also update all vehicles of this type
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.type === type
          ? { ...vehicle, surcharge: newSurcharge }
          : vehicle,
      ),
    );
  };

  // Save changes
  const saveChanges = async () => {
    setSaving(true);
    try {
      // Filter only changed vehicle types
      const changedTypes = vehicleTypes.filter(
        (vehicleType) =>
          vehicleType.price_km !== vehicleType.original_price_km ||
          vehicleType.basic_price !== vehicleType.original_basic_price ||
          vehicleType.surcharge !== vehicleType.original_surcharge,
      );

      if (changedTypes.length === 0) {
        toast({
          title: "No Changes",
          description: "No price changes to save",
        });
        setSaving(false);
        return;
      }

      // Update all vehicles for each changed type
      for (const vehicleType of changedTypes) {
        const { error } = await supabase
          .from("vehicles")
          .update({
            price_km: vehicleType.price_km,
            basic_price: vehicleType.basic_price,
            surcharge: vehicleType.surcharge,
          })
          .eq("type", vehicleType.type);

        if (error) throw error;
      }

      // Count total vehicles updated
      const totalVehiclesUpdated = changedTypes.reduce(
        (total, type) => total + type.vehicleIds.length,
        0,
      );

      toast({
        title: "Success",
        description: `Updated prices for ${totalVehiclesUpdated} vehicle(s) across ${changedTypes.length} type(s)`,
      });

      // Refresh data to get updated values
      fetchVehicles();
    } catch (error) {
      console.error("Error saving vehicle prices:", error);
      toast({
        title: "Error",
        description: "Failed to save price changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter vehicle types by type for each tab
  const getVehicleTypesByCategory = (category: string) => {
    return vehicleTypes.filter(
      (vehicleType) =>
        vehicleType.type &&
        typeof vehicleType.type === "string" &&
        vehicleType.type.toLowerCase().includes(category.toLowerCase()),
    );
  };

  const mpvVehicleTypes = getVehicleTypesByCategory("mpv").filter(
    (v) =>
      v.type &&
      typeof v.type === "string" &&
      !v.type.toLowerCase().includes("premium"),
  );
  const mpvPremiumVehicleTypes = getVehicleTypesByCategory("premium");
  const electricVehicleTypes = getVehicleTypesByCategory("electric");

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-tosca to-primary-dark bg-clip-text text-transparent">
          Price KM Management
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchVehicles}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            onClick={saveChanges}
            disabled={saving || loading}
            className="bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="mpv"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mpv">MPV Price KM</TabsTrigger>
          <TabsTrigger value="premium">MPV Premium Price KM</TabsTrigger>
          <TabsTrigger value="electric">Electric Price KM</TabsTrigger>
        </TabsList>

        <TabsContent value="mpv" className="mt-6">
          <PriceTable
            vehicleTypes={mpvVehicleTypes}
            loading={loading}
            onChange={handleTypePriceChange}
            onBasicPriceChange={handleTypeBasicPriceChange}
            onSurchargeChange={handleTypeSurchargeChange}
            title="MPV Vehicles"
          />
        </TabsContent>

        <TabsContent value="premium" className="mt-6">
          <PriceTable
            vehicleTypes={mpvPremiumVehicleTypes}
            loading={loading}
            onChange={handleTypePriceChange}
            onBasicPriceChange={handleTypeBasicPriceChange}
            onSurchargeChange={handleTypeSurchargeChange}
            title="MPV Premium Vehicles"
          />
        </TabsContent>

        <TabsContent value="electric" className="mt-6">
          <PriceTable
            vehicleTypes={electricVehicleTypes}
            loading={loading}
            onChange={handleTypePriceChange}
            onBasicPriceChange={handleTypeBasicPriceChange}
            onSurchargeChange={handleTypeSurchargeChange}
            title="Electric Vehicles"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface PriceTableProps {
  vehicleTypes: VehicleTypePrice[];
  loading: boolean;
  onChange: (type: string, price: number) => void;
  onBasicPriceChange: (type: string, price: number) => void;
  onSurchargeChange: (type: string, surcharge: string) => void;
  title: string;
}

const PriceTable = ({
  vehicleTypes,
  loading,
  onChange,
  onBasicPriceChange,
  onSurchargeChange,
  title,
}: PriceTableProps) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-tosca" />
      </div>
    );
  }

  if (vehicleTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            No vehicles found in this category
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Price (per km)</th>
                <th className="text-left py-3 px-4">Basic Price</th>
                <th className="text-left py-3 px-4">Surcharge</th>
                <th className="text-left py-3 px-4">Vehicle Count</th>
              </tr>
            </thead>
            <tbody>
              {vehicleTypes.map((vehicleType) => {
                const priceKmChanged =
                  vehicleType.price_km !== vehicleType.original_price_km;
                const basicPriceChanged =
                  vehicleType.basic_price !== vehicleType.original_basic_price;
                const surchargeChanged =
                  vehicleType.surcharge !== vehicleType.original_surcharge;
                return (
                  <tr
                    key={vehicleType.type}
                    className="border-b hover:bg-muted/50"
                  >
                    <td className="py-3 px-4">{vehicleType.type}</td>
                    <td className="py-3 px-4">
                      <Input
                        type="number"
                        value={vehicleType.price_km}
                        onChange={(e) =>
                          onChange(
                            vehicleType.type,
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className={priceKmChanged ? "border-primary-tosca" : ""}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        type="number"
                        value={vehicleType.basic_price}
                        onChange={(e) =>
                          onBasicPriceChange(
                            vehicleType.type,
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className={
                          basicPriceChanged ? "border-primary-tosca" : ""
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        type="text"
                        value={vehicleType.surcharge || ""}
                        onChange={(e) =>
                          onSurchargeChange(vehicleType.type, e.target.value)
                        }
                        className={
                          surchargeChanged ? "border-primary-tosca" : ""
                        }
                        placeholder="Enter surcharge"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-muted-foreground">
                        {vehicleType.vehicleIds.length} vehicle(s)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceKMManagement;
