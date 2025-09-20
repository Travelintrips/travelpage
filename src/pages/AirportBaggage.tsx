import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Package, Luggage, PackageOpen, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import BookingForm from "@/pages/BookingFormBag";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  JoinedIcon,
  SurfingIcon,
  WheelchairIcon,
  GolfIcon,
} from "@/components/icons";


// Types
interface BaggagePrice {
  id: string;
  baggage_size: string;
  baggage_prices: number;
  created_at: string;
  updated_at: string;
}

interface BaggageOption {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ReactNode;
  features: string[];
  maxDimensions: string;
  maxWeight: string;
  examples: string[];
}

// Utility function to validate baggage size
const validateBaggageSize = (size: string): string => {
  const validSizes = [
    "small",
    "electronic",
    "medium",
    "large",
    "extra_large",
    "surfingboard",
    "wheelchair",
    "stickgolf",
  ];
  return validSizes.includes(size) ? size : "small";
};

const AirportBaggage: React.FC = () => {
  const [baggagePrices, setBaggagePrices] = useState<BaggagePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch baggage prices from database
  const fetchBaggagePrices = useCallback(async () => {
    try {
    //  console.log("🔄 Fetching baggage prices from database...");

      const { data, error } = await supabase
        .from("baggage_price")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
      //  console.warn("⚠️ Database query failed, using default prices:", error);
        
        // Use default prices as fallback
        const defaultPrices: BaggagePrice[] = [
          {
            id: "1",
            baggage_size: "small",
            baggage_prices: 70000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            baggage_size: "electronic",
            baggage_prices: 90000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "3",
            baggage_size: "medium",
            baggage_prices: 80000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "4",
            baggage_size: "large",
            baggage_prices: 90000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "5",
            baggage_size: "extra_large",
            baggage_prices: 100000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "6",
            baggage_size: "surfingboard",
            baggage_prices: 100000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "7",
            baggage_size: "wheelchair",
            baggage_prices: 110000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "8",
            baggage_size: "stickgolf",
            baggage_prices: 110000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setBaggagePrices(defaultPrices);
        return;
      }

      // If no data is returned, use default prices
      if (!data || data.length === 0) {
      //  console.warn("⚠️ No baggage prices found in database, using default prices");
        const defaultPrices: BaggagePrice[] = [
          {
            id: "1",
            baggage_size: "small",
            baggage_prices: 70000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            baggage_size: "electronic",
            baggage_prices: 90000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "3",
            baggage_size: "medium",
            baggage_prices: 80000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "4",
            baggage_size: "large",
            baggage_prices: 90000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "5",
            baggage_size: "extra_large",
            baggage_prices: 100000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "6",
            baggage_size: "surfingboard",
            baggage_prices: 100000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "7",
            baggage_size: "wheelchair",
            baggage_prices: 110000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "8",
            baggage_size: "stickgolf",
            baggage_prices: 110000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setBaggagePrices(defaultPrices);
      } else {
     //   console.log("🎉 SUCCESS: Setting fetched prices from database:", data);
        setBaggagePrices(data);
      }
    } catch (error) {
      console.error("🚨 Unexpected error fetching baggage prices:", error);
      
      // Use default prices as fallback
      const defaultPrices: BaggagePrice[] = [
        {
          id: "1",
          baggage_size: "small",
          baggage_prices: 50000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "2",
          baggage_size: "electronic",
          baggage_prices: 75000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "3",
          baggage_size: "medium",
          baggage_prices: 100000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "4",
          baggage_size: "large",
          baggage_prices: 150000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "5",
          baggage_size: "extra_large",
          baggage_prices: 200000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "6",
          baggage_size: "surfingboard",
          baggage_prices: 250000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "7",
          baggage_size: "wheelchair",
          baggage_prices: 100000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "8",
          baggage_size: "stickgolf",
          baggage_prices: 175000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setBaggagePrices(defaultPrices);
      toast({
        title: "Warning",
        description: "Using default prices - database connection issue",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Setup auth listener and initial session check - runs once on mount
  useEffect(() => {
    console.log("[AirportBaggage] Setting up auth listener and initial data load...");
    
    let mounted = true;
    
    const initializeComponent = async () => {
      try {
        // 1. Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AirportBaggage] Session check error:", error);
        }

        if (mounted) {
          if (session) {
            console.log("[AirportBaggage] ✅ Session found");
            setIsAuthenticated(true);
          } else {
            console.log("[AirportBaggage] ❌ No session found");
            setIsAuthenticated(false);
          }
        }

        // 2. Fetch baggage prices
        await fetchBaggagePrices();
        
        // 3. Set loading to false after everything is done
        if (mounted) {
          console.log("[AirportBaggage] 🏁 Initialization complete, setting loading to false");
          setLoading(false);
        }
      } catch (error) {
        console.error("[AirportBaggage] Initialization error:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Start initialization
    initializeComponent();
    
    // Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AirportBaggage] Auth state changed: ${event}`);
      
      if (mounted) {
        if (session) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    });

    // Handle tab visibility changes - validate session when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        console.log('[AirportBaggage] Tab became visible, validating session...');
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (!error && mounted) {
            if (session) {
              console.log("[AirportBaggage] ✅ Session validated on tab focus");
              setIsAuthenticated(true);
            } else {
              console.log("[AirportBaggage] ❌ No session on tab focus");
              setIsAuthenticated(false);
            }
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      console.log("[AirportBaggage] Cleaning up auth listener");
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty dependency array - runs once on mount

  // Get price for a specific baggage size with validation
  const getPriceForSize = (size: string): number => {
    const validatedSize = validateBaggageSize(size);
    const priceEntry = baggagePrices.find(
      (p) => p.baggage_size === validatedSize,
    );
    const price = priceEntry?.baggage_prices || 0;
    return price;
  };

  // Check if baggage prices are loaded and valid
  const arePricesLoaded = !loading && baggagePrices && baggagePrices.length > 0;

  // Baggage options with dynamic pricing - use useMemo to recalculate when prices change
  const baggageOptions: BaggageOption[] = useMemo(() => {
    // Don't return options if prices aren't loaded yet
    if (!arePricesLoaded) {
      return [];
    }

    return [
      {
        id: "small",
        name: "Small Baggage",
        description: "Perfect for small personal items and documents",
        price: getPriceForSize("small"),
        icon: <Package className="h-8 w-8" />,
        features: ["Secure storage", "24/7 access", "Insurance included"],
        //maxDimensions: "40cm x 30cm x 20cm",
        //maxWeight: "5kg",
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
       // maxDimensions: "50cm x 40cm x 30cm",
       // maxWeight: "10kg",
        examples: ["Laptops", "Cameras", "Gaming consoles"],
      },
      {
        id: "medium",
        name: "Medium Baggage",
        description: "Ideal for standard travel luggage",
        price: getPriceForSize("medium"),
        icon: <Luggage className="h-8 w-8" />,
        features: ["Standard storage", "Easy retrieval", "Damage protection"],
       // maxDimensions: "60cm x 40cm x 30cm",
       // maxWeight: "15kg",
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
       // maxDimensions: "80cm x 60cm x 40cm",
       // maxWeight: "25kg",
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
       // maxDimensions: "100cm x 80cm x 60cm",
      //  maxWeight: "35kg",
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
       // maxDimensions: "300cm x 60cm x 20cm",
       // maxWeight: "15kg",
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
       // maxDimensions: "120cm x 70cm x 90cm",
      // maxWeight: "50kg",
        examples: ["Manual wheelchair", "Electric wheelchair", "Mobility aids"],
      },
      {
        id: "stickgolf",
        name: "Golf Equipment",
        description: "Secure storage for golf clubs and equipment",
        price: getPriceForSize("stickgolf"),
        icon: <GolfIcon className="h-8 w-8" />,
        features: [
          "Sports equipment care",
          "Organized storage",
          "Quick access",
        ],
       // maxDimensions: "130cm x 40cm x 30cm",
       // maxWeight: "20kg",
        examples: ["Golf clubs", "Golf bag", "Golf accessories"],
      },
    ];
  }, [baggagePrices, arePricesLoaded]);

  const handleSizeSelect = (size: string) => {
    // Simple authentication check
    if (!isAuthenticated) {
      console.log('[AirportBaggage] Authentication required - showing auth modal');
      setShowAuthModal(true);
      return;
    }
    
    const validatedSize = validateBaggageSize(size);
    console.log(`🎯 Size selected: ${size} (validated: ${validatedSize})`);
    setSelectedSize(validatedSize);
    setShowBookingForm(true);
  };

  const handleBackToSelection = () => {
    setShowBookingForm(false);
    setSelectedSize(null);
  };

  // Single loading check at the top of render
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
              onCancel={handleBackToSelection}
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
        {/* Navigation Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
            >
              <Home className="h-4 w-4" />
              Back to Home Page
            </Button>
          </div>
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Airport Baggage Storage
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Secure, convenient, and affordable baggage storage solutions at the airport.
              Choose from our range of storage options to suit your needs.
            </p>
          </div>
          
          
          

          {/* Baggage Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {baggageOptions.map((option) => (
              <Card
                key={option.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleSizeSelect(option.id)}
              >
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4 text-blue-600 group-hover:text-blue-700 transition-colors">
                    {option.icon}
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    {option.name}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {option.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      Rp {option.price.toLocaleString('id-ID')}
                    </div>
                    <div className="text-sm text-gray-500">per day</div>
                  </div>

                  {/* Specifications */}
              {  /*  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Max Size:</span>{" "}
                      {option.maxDimensions}
                    </div>
                    <div>
                      <span className="font-medium">Max Weight:</span>{" "}
                      {option.maxWeight}
                    </div>
                  </div>*/}

                  {/* Features */}
                  <div className="space-y-2">
                    <div className="font-medium text-sm">Features:</div>
                    <div className="flex flex-wrap gap-1">
                      {option.features.map((feature, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Examples */}
                  <div className="space-y-2">
                    <div className="font-medium text-sm">Perfect for:</div>
                    <div className="text-xs text-gray-600">
                      {option.examples.join(", ")}
                    </div>
                  </div>

                  {/* Select Button */}
                  <Button className="w-full mt-4 group-hover:bg-blue-700 transition-colors">
                    Select This Option
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Information */}
          <div className="mt-16 bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Why Choose Our Baggage Storage?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Secure Storage</h3>
                <p className="text-gray-600">
                  24/7 monitored facilities with advanced security systems and
                  insurance coverage for your peace of mind.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Luggage className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Convenient Location</h3>
                <p className="text-gray-600">
                  Located right at the airport for easy drop-off and pickup.
                  No need to travel far from your terminal.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PackageOpen className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Flexible Options</h3>
                <p className="text-gray-600">
                  Multiple size options and storage durations to fit your
                  specific needs and budget requirements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Authentication Required</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAuthModal(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-gray-600 mb-4">
              Please sign in to book baggage storage services.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowAuthModal(false);
                  window.location.href = '/login';
                }}
                className="flex-1"
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAuthModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
};

export default AirportBaggage;