import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Toast from "../Toast";
import { useToast } from "@/components/ui/use-toast";

import { Loader2, Save, RefreshCw } from "lucide-react";

interface BaggagePrice {
  id: string;
  baggage_size: string;
  baggage_prices: number;
  created_at?: string;
  updated_at?: string;
}

interface BaggagePriceState {
  [key: string]: {
    id?: string;
    baggage_prices: number;
  };
}

const PriceBaggage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("small");
  const [baggagePrices, setBaggagePrices] = useState<BaggagePriceState>({
    small: { baggage_prices: 0 },
    medium: { baggage_prices: 0 },
    large: { baggage_prices: 0 },
    extra_large: { baggage_prices: 0 },
    electronic: { baggage_prices: 0 },
    surfingboard: { baggage_prices: 0 },
    wheelchair: { baggage_prices: 0 },
    stickgolf: { baggage_prices: 0 },
  });
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  const baggageTypes = [
    {
      key: "small",
      label: "Small Price",
      title: "Small Baggage Price",
      description: "Set price for small baggage",
    },
    {
      key: "medium",
      label: "Medium Price",
      title: "Medium Baggage Price",
      description: "Set price for medium baggage",
    },
    {
      key: "large",
      label: "Large Price",
      title: "Large Baggage Price",
      description: "Set price for large baggage",
    },
    {
      key: "extra_large",
      label: "Extra Large Price",
      title: "Extra Large Baggage Price",
      description: "Set price for extra large baggage",
    },
    {
      key: "electronic",
      label: "Electronic Price",
      title: "Electronic Price",
      description: "Set price for electronic items",
    },
    {
      key: "surfingboard",
      label: "Surfing/Board Price",
      title: "Surfing Price",
      description: "Set price for surfing/board items",
    },
    {
      key: "wheelchair",
      label: "Wheelchair Price",
      title: "Wheelchair Price",
      description: "Set price for wheelchair",
    },
    {
      key: "stickgolf",
      label: "Stick Golf Price",
      title: "Stickgolf Price",
      description: "Set price for stick golf",
    },
  ];

  // Fetch baggage prices from database
  const fetchBaggagePrices = async () => {
    setLoading(true);
    setIsDataLoaded(false);
    try {
      const { data, error } = await supabase.from("baggage_price").select("*");

      if (error) {
        console.error("Error fetching baggage prices:", error);
        toast({
          title: "Error",
          description: "Gagal mengambil data harga bagasi.",
          variant: "destructive",
        });
        return;
      }

      if (data && data.length > 0) {
<<<<<<< HEAD
        const price = data[0];
        setSmallPrice(Number(price.small_price) || 0);
        setMediumPrice(Number(price.medium_price) || 0);
        setLargePrice(Number(price.large_price) || 0);
        setExtraLargePrice(Number(price.extra_large_price) || 0);
        setElectronicPrice(Number(price.electronic_price) || 0);
        setWheelchairPrice(Number(price.wheelchair_price) || 0);
        setSurfingPrice(Number(price.surfingboard_price) || 0);
        setStickgolfPrice(Number(price.stickgolf_price) || 0);
        setPriceId(price.id);
        console.log("Fetched baggage price3:", price);
=======
        console.log("Fetched baggage prices from database:", data);

        // Initialize state with default values
        const pricesState: BaggagePriceState = {
          small: { baggage_prices: 0 },
          medium: { baggage_prices: 0 },
          large: { baggage_prices: 0 },
          extra_large: { baggage_prices: 0 },
          electronic: { baggage_prices: 0 },
          surfingboard: { baggage_prices: 0 },
          wheelchair: { baggage_prices: 0 },
          stickgolf: { baggage_prices: 0 },
        };

        // Map each row to the corresponding baggage type based on baggage_size column
        data.forEach((record: BaggagePrice) => {
          const baggageType = record.baggage_size;
          console.log(
            `Processing record: ${baggageType} = ${record.baggage_prices}`,
          );

          if (pricesState[baggageType]) {
            pricesState[baggageType] = {
              id: record.id,
              baggage_prices: Number(record.baggage_prices) || 0,
            };
            console.log(
              `Mapped ${baggageType} to price: ${pricesState[baggageType].baggage_prices}`,
            );
          } else {
            console.warn(`Unknown baggage type: ${baggageType}`);
          }
        });

        console.log("Final mapped baggage prices to state:", pricesState);
        setBaggagePrices(pricesState);
        setIsDataLoaded(true);
>>>>>>> 40616bc (25/07/2025)
      } else {
        console.log("No data found, creating initial records");
        await createInitialPriceRecord();
      }
    } catch (error) {
      console.error("Error in fetchBaggagePrices:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create initial price record if none exist
  const createInitialPriceRecord = async () => {
    try {
      const initialPrices = [
        { baggage_size: "small", baggage_prices: 50000 },
        { baggage_size: "medium", baggage_prices: 75000 },
        { baggage_size: "large", baggage_prices: 100000 },
        { baggage_size: "extra_large", baggage_prices: 125000 },
        { baggage_size: "electronic", baggage_prices: 80000 },
        { baggage_size: "surfingboard", baggage_prices: 150000 },
        { baggage_size: "wheelchair", baggage_prices: 60000 },
        { baggage_size: "stickgolf", baggage_prices: 120000 },
      ];

      const { data, error } = await supabase
        .from("baggage_price")
        .insert(initialPrices)
        .select("*");

      if (error) {
        console.error("Error creating initial price records:", error);
        toast({
          title: "Error",
          description: "Gagal membuat data harga bagasi awal.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        console.log("Created initial price records:", data);
        await fetchBaggagePrices();
      }
    } catch (error) {
      console.error("Error in createInitialPriceRecord:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat membuat data awal.",
        variant: "destructive",
      });
    }
  };

  // Get price for specific baggage type
  const getPriceForType = (baggageType: string): number => {
    if (!isDataLoaded) {
      return 0;
    }

    const priceData = baggagePrices[baggageType];
    const price = priceData?.baggage_prices || 0;

    return price;
  };

  // Handle price change
  const handlePriceChange = (baggageType: string, value: string) => {
    const numValue = parseFloat(value) || 0;

    setBaggagePrices((prev) => ({
      ...prev,
      [baggageType]: {
        ...prev[baggageType],
        baggage_prices: numValue,
      },
    }));
  };

  // Save changes to database
  const saveChanges = async () => {
    if (!isDataLoaded) return;

    setSaving(true);
    try {
      // Update each baggage type individually
      for (const [baggageType, priceData] of Object.entries(baggagePrices)) {
        if (priceData.id) {
          // Update existing record
          const { error } = await supabase
            .from("baggage_price")
            .update({
              baggage_prices: priceData.baggage_prices,
              updated_at: new Date().toISOString(),
            })
            .eq("id", priceData.id);

          if (error) {
            console.error(`Error updating ${baggageType} price:`, error);
            throw error;
          }
        } else {
          // Insert new record
          const { error } = await supabase.from("baggage_price").insert({
            baggage_size: baggageType,
            baggage_prices: priceData.baggage_prices,
          });

          if (error) {
            console.error(`Error inserting ${baggageType} price:`, error);
            throw error;
          }
        }
      }

      // Refresh data from database
      await fetchBaggagePrices();

      toast({
        title: "Success",
        description: "Harga bagasi berhasil diperbarui.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error in saveChanges:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan harga bagasi.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchBaggagePrices();
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  return (
    <div className="container mx-auto py-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-tosca to-primary-dark bg-clip-text text-transparent">
          Baggage Price Management
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchBaggagePrices}
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

        {/* Toast notification */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          {baggageTypes.slice(0, 4).map((type) => (
            <TabsTrigger key={type.key} value={type.key}>
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsList className="grid w-full grid-cols-4 mt-2">
          {baggageTypes.slice(4).map((type) => (
            <TabsTrigger key={type.key} value={type.key}>
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {baggageTypes.map((type) => {
          const currentPrice = getPriceForType(type.key);
          return (
            <TabsContent key={type.key} value={type.key} className="mt-6">
              <BaggagePriceCard
                title={type.title}
                description={type.description}
                price={currentPrice}
                onChange={(value) => handlePriceChange(type.key, value)}
                loading={loading}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

interface BaggagePriceCardProps {
  title: string;
  description: string;
  price: number;
  onChange: (value: string) => void;
  loading: boolean;
}

const BaggagePriceCard = ({
  title,
  description,
  price,
  onChange,
  loading,
}: BaggagePriceCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-tosca" />
          </div>
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
        <div className="space-y-4">
          <p className="text-muted-foreground">{description}</p>

          <div className="flex flex-col space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              Price (IDR)
            </label>
            <div className="flex items-center gap-4">
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => onChange(e.target.value)}
                className="w-full"
                placeholder="Enter price in IDR"
              />
              <div className="text-lg font-semibold">
                {formatCurrency(price)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceBaggage;
