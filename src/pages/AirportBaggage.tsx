import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import BookingForm from "@/pages/BookingFormBag";
import {
  Package,
  PackageOpen,
  Luggage,
  Boxes,
  ArrowLeft,
  MapPin,
  Clock,
  Shield,
  CheckCircle,
} from "lucide-react";
import {
  JoinedIcon,
  SurfingIcon,
  WheelchairIcon,
  GolfIcon,
} from "@/components/icons";

interface BaggageOption {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ReactNode;
  features: string[];
  maxDimensions?: string;
  maxWeight?: string;
  examples?: string[];
}

interface BaggagePrice {
  id: string;
  size: string;
  price: number;
  created_at: string;
  updated_at: string;
}

type BaggageSize =
  | "small"
  | "electronic"
  | "medium"
  | "large"
  | "extra_large"
  | "surfingboard"
  | "wheelchair"
  | "stickgolf";

const AirportBaggage: React.FC = () => {
  const { isAuthenticated, userId } = useAuth();
  const [selectedSize, setSelectedSize] = useState<BaggageSize | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [baggagePrices, setBaggagePrices] = useState<BaggagePrice[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch baggage prices from database
  const fetchBaggagePrices = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("baggage_price")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching baggage prices:", error);
        toast({
          title: "Error",
          description: "Failed to load baggage prices",
          variant: "destructive",
        });
        return;
      }

      setBaggagePrices(data || []);
    } catch (error) {
      console.error("Error fetching baggage prices:", error);
      toast({
        title: "Error",
        description: "Failed to load baggage prices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBaggagePrices();
  }, [fetchBaggagePrices]);

  // Get price for a specific baggage size
  const getPriceForSize = (size: BaggageSize): number => {
    const priceEntry = baggagePrices.find((p) => p.size === size);
    return priceEntry?.price || 0;
  };

  // Baggage options with dynamic pricing
  const baggageOptions: BaggageOption[] = [
    {
      id: "small",
      name: "Small Baggage",
      description: "Perfect for small personal items and documents",
      price: getPriceForSize("small"),
      icon: <Package className="h-8 w-8" />,
      features: ["Secure storage", "24/7 access", "Insurance included"],
      maxDimensions: "40cm x 30cm x 20cm",
      maxWeight: "5kg",
      examples: ["Laptop bag", "Small backpack", "Documents"],
    },
    {
      id: "electronic",
      name: "Electronic Items",
      description: "Specialized storage for electronic devices",
      price: getPriceForSize("electronic"),
      icon: <JoinedIcon className="h-8 w-8" />,
      features: [
        "Climate controlled",
        "Anti-static protection",
        "Secure handling",
      ],
      maxDimensions: "50cm x 40cm x 30cm",
      maxWeight: "10kg",
      examples: ["Laptops", "Cameras", "Gaming consoles"],
    },
    {
      id: "medium",
      name: "Medium Baggage",
      description: "Ideal for standard travel luggage",
      price: getPriceForSize("medium"),
      icon: <Luggage className="h-8 w-8" />,
      features: ["Standard storage", "Easy retrieval", "Damage protection"],
      maxDimensions: "60cm x 40cm x 30cm",
      maxWeight: "15kg",
      examples: ["Carry-on luggage", "Medium suitcase", "Travel bag"],
    },
    {
      id: "large",
      name: "Large Baggage",
      description: "For bigger luggage and multiple items",
      price: getPriceForSize("large"),
      icon: <PackageOpen className="h-8 w-8" />,
      features: [
        "Spacious storage",
        "Multiple item handling",
        "Extended security",
      ],
      maxDimensions: "80cm x 60cm x 40cm",
      maxWeight: "25kg",
      examples: ["Large suitcase", "Multiple bags", "Sports equipment"],
    },
    {
      id: "extra_large",
      name: "Extra Large Baggage",
      description: "Maximum storage for oversized items",
      price: getPriceForSize("extra_large"),
      icon: <Boxes className="h-8 w-8" />,
      features: [
        "Maximum capacity",
        "Oversized item handling",
        "Premium security",
      ],
      maxDimensions: "100cm x 80cm x 60cm",
      maxWeight: "35kg",
      examples: ["Oversized luggage", "Multiple large items", "Bulk storage"],
    },
    {
      id: "surfingboard",
      name: "Surfing Board",
      description: "Specialized storage for surfboards and long items",
      price: getPriceForSize("surfingboard"),
      icon: <SurfingIcon className="h-8 w-8" />,
      features: [
        "Vertical storage",
        "Protective padding",
        "Climate controlled",
      ],
      maxDimensions: "300cm x 60cm x 20cm",
      maxWeight: "15kg",
      examples: ["Surfboards", "Skis", "Long sporting equipment"],
    },
    {
      id: "wheelchair",
      name: "Wheelchair",
      description: "Safe and secure wheelchair storage",
      price: getPriceForSize("wheelchair"),
      icon: <WheelchairIcon className="h-8 w-8" />,
      features: [
        "Accessibility focused",
        "Careful handling",
        "Priority service",
      ],
      maxDimensions: "120cm x 70cm x 90cm",
      maxWeight: "50kg",
      examples: ["Manual wheelchair", "Electric wheelchair", "Mobility aids"],
    },
    {
      id: "stickgolf",
      name: "Golf Equipment",
      description: "Secure storage for golf clubs and equipment",
      price: getPriceForSize("stickgolf"),
      icon: <GolfIcon className="h-8 w-8" />,
      features: ["Sports equipment care", "Organized storage", "Quick access"],
      maxDimensions: "130cm x 40cm x 30cm",
      maxWeight: "20kg",
      examples: ["Golf clubs", "Golf bag", "Golf accessories"],
    },
  ];

  const handleSizeSelect = (size: BaggageSize) => {
    setSelectedSize(size);
    setShowBookingForm(true);
  };

  const handleBackToSelection = () => {
    setShowBookingForm(false);
    setSelectedSize(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading baggage options...</p>
        </div>
      </div>
    );
  }

  if (showBookingForm && selectedSize) {
    const selectedOption = baggageOptions.find(
      (option) => option.id === selectedSize,
    );
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToSelection}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Book {selectedOption?.name}
                </h1>
                <p className="text-gray-600">
                  Complete your baggage storage booking
                </p>
              </div>
            </div>
            <BookingForm
              selectedSize={selectedSize}
              price={selectedOption?.price || 0}
              onBack={handleBackToSelection}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Luggage className="h-10 w-10 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">
                Airport Baggage Storage
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Secure, convenient, and affordable baggage storage solutions at
              the airport. Choose from our range of storage options to fit your
              needs.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center p-6">
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Secure Storage</h3>
              <p className="text-gray-600">
                24/7 monitored facilities with advanced security systems
              </p>
            </Card>
            <Card className="text-center p-6">
              <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Flexible Hours</h3>
              <p className="text-gray-600">
                Access your belongings anytime with our 24/7 service
              </p>
            </Card>
            <Card className="text-center p-6">
              <MapPin className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Prime Location</h3>
              <p className="text-gray-600">
                Conveniently located within the airport terminal
              </p>
            </Card>
          </div>

          {/* Baggage Options */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Choose Your Storage Size
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {baggageOptions.map((option) => (
                <Card
                  key={option.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleSizeSelect(option.id as BaggageSize)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-3 text-blue-600 group-hover:text-blue-700 transition-colors">
                      {option.icon}
                    </div>
                    <CardTitle className="text-lg">{option.name}</CardTitle>
                    <div className="text-2xl font-bold text-green-600">
                      Rp {option.price.toLocaleString("id-ID")}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 text-sm mb-4">
                      {option.description}
                    </p>

                    {option.maxDimensions && (
                      <div className="mb-3">
                        <Badge variant="outline" className="text-xs">
                          Max: {option.maxDimensions}
                        </Badge>
                        {option.maxWeight && (
                          <Badge variant="outline" className="text-xs ml-2">
                            {option.maxWeight}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      {option.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {option.examples && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-gray-500 mb-2">Examples:</p>
                        <div className="flex flex-wrap gap-1">
                          {option.examples.map((example, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {example}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full mt-4 group-hover:bg-blue-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSizeSelect(option.id as BaggageSize);
                      }}
                    >
                      Select This Size
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                Important Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-2">Storage Terms:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Minimum storage period: 1 hour</li>
                    <li>Maximum storage period: 30 days</li>
                    <li>Items must be properly packed</li>
                    <li>No hazardous materials allowed</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">What's Included:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Insurance coverage up to $1000</li>
                    <li>24/7 security monitoring</li>
                    <li>Climate-controlled environment</li>
                    <li>Easy online booking and payment</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AirportBaggage;
