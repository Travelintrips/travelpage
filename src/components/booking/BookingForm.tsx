import React, { useState, useEffect } from "react";
import PickupCustomer from "./PickupCustomer";
import BookingSummary from "./BookingSummary";
import { supabase } from "@/lib/supabase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useNavigate, Link } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import {
  CalendarIcon,
  CreditCard,
  Banknote,
  Building2,
  Check,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate, toISOString } from "@/lib/utils";

const formSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  pickupTime: z.string().min(1, "Pickup time is required"),
  returnTime: z.string().min(1, "Return time is required"),
  driverOption: z.enum(["self", "provided"], {
    required_error: "Please select a driver option",
  }),
  driverId: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface Vehicle {
  id: string | number; // Allow both string and number for compatibility
  make: string;
  model: string;
  year?: number;
  type?: "sedan" | "suv" | "truck" | "luxury";
  category?: string;
  price: number;
  image?: string;
  license_plate?: string;
  seats?: number;
  transmission?: "automatic" | "manual";
  fuel_type?: "petrol" | "diesel" | "electric" | "hybrid";
  available?: boolean;
  features?: string[];
  isWithDriver?: boolean;
  assignedDriver?: {
    id: string;
    name: string;
  };
}

interface BookingFormProps {
  selectedVehicle?: Vehicle | null;
  onBookingComplete?: (bookingData: any) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
  selectedVehicle = null,
  onBookingComplete = () => {},
}) => {
  const navigate = useNavigate();
  const { addToCart } = useShoppingCart();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");
  const [showInspection, setShowInspection] = useState(false);
  const [showPickupCustomer, setShowPickupCustomer] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

  // Default vehicle if none is selected
  const defaultVehicle: Vehicle = {
    id: 1, // Changed from string "1" to number 1
    make: "Toyota",
    model: "Avanza",
    year: 2022,
    category: "MPV",
    price: 350000,
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    license_plate: "B 1234 ABC",
    seats: 7,
    transmission: "automatic",
    fuel_type: "petrol",
    available: true,
    features: ["AC", "Power Steering"],
    isWithDriver: false,
    assignedDriver: undefined,
  };

  // Use selected vehicle or default
  const vehicleToUse =
    vehicles.find((v) => v.id === selectedVehicle?.id) ||
    selectedVehicle ||
    defaultVehicle;

  // Format currency to IDR
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    if (vehicleToUse?.isWithDriver) {
      form.setValue("driverOption", "provided");
      if (vehicleToUse.assignedDriver?.id) {
        form.setValue("driverId", vehicleToUse.assignedDriver.id);
        form.trigger("driverId"); // ✅ Pastikan form aware terhadap value ini
      }
      console.log("🚗 Selected Vehicle Details:", vehicleToUse);
    }
  }, [vehicleToUse]);

  useEffect(() => {
    // Fetch vehicles from Supabase
    const fetchVehicles = async () => {
      setIsLoadingVehicles(true);
      try {
        // Use default vehicle instead of trying to fetch from Supabase
        // This is a temporary solution until Supabase connection is fixed
        console.log(
          "Using default vehicle data instead of fetching from Supabase",
        );

        // Create an array of sample vehicles
        const sampleVehicles: Vehicle[] = [
          defaultVehicle,
          {
            id: 2, // Changed from string "2" to number 2
            make: "Honda",
            model: "CR-V",
            year: 2023,
            category: "SUV",
            price: 450000,
            image:
              "https://images.unsplash.com/photo-1568844293986-ca9c5c1bc2e8?w=800&q=80",
            license_plate: "B 5678 DEF",
            seats: 5,
            transmission: "automatic",
            fuel_type: "petrol",
            available: true,
            features: ["AC", "Power Steering", "ABS"],
            isWithDriver: false,
            assignedDriver: undefined,
          },
          {
            id: 3, // Changed from string "3" to number 3
            make: "Mitsubishi",
            model: "Xpander",
            year: 2022,
            category: "MPV",
            price: 380000,
            image:
              "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80",
            license_plate: "B 9012 GHI",
            seats: 7,
            transmission: "manual",
            fuel_type: "petrol",
            available: true,
            features: ["AC", "Power Steering"],
            isWithDriver: false,
            assignedDriver: undefined,
          },
        ];

        setVehicles(sampleVehicles);
      } catch (error) {
        console.error("Error setting up vehicles:", error);
        // Use default vehicle on error
        setVehicles([defaultVehicle]);
      } finally {
        setIsLoadingVehicles(false);
      }
    };

    // Fetch available drivers
    const fetchDrivers = async () => {
      setIsLoadingDrivers(true);
      try {
        const { data, error } = await supabase
          .from("drivers")
          .select("id, name, status")
          .eq("status", "active");

        if (error) throw error;

        if (data && data.length > 0) {
          setAvailableDrivers(data);
        } else {
          // Sample drivers if no data from Supabase
          setAvailableDrivers([
            { id: "d1", name: "John Driver", status: "active" },
            { id: "d2", name: "Maria Driver", status: "active" },
            { id: "d3", name: "Alex Driver", status: "active" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching drivers:", error);
        // Use sample drivers on error
        setAvailableDrivers([
          { id: "d1", name: "John Driver", status: "active" },
          { id: "d2", name: "Maria Driver", status: "active" },
          { id: "d3", name: "Alex Driver", status: "active" },
        ]);
      } finally {
        setIsLoadingDrivers(false);
      }
    };

    // Fetch full details if selectedVehicle is missing fields
    const fetchSelectedVehicleDetails = async () => {
      if (
        selectedVehicle?.id &&
        (!selectedVehicle.make ||
          !selectedVehicle.model ||
          !selectedVehicle.category)
      ) {
        const { data, error } = await supabase
          .from("vehicles")
          .select(
            `
    make,
    model,
    category,
    price,
    year,
    image,
    license_plate,
    is_with_driver,
    driver_id,
    assignedDriver:driver_id (
      id,
      name
    )
  `,
          )
          .eq("id", selectedVehicle.id)
          .single();

        if (error) {
          console.error("Failed to fetch full vehicle data:", error);
          return;
        }

        // Merge detail data ke selectedVehicle
        setVehicles((prev) => [
          ...prev.filter((v) => v.id !== selectedVehicle.id),
          { ...selectedVehicle, ...data },
        ]);
      }
    };

    fetchVehicles();
    fetchDrivers();
    fetchSelectedVehicleDetails();

    // Check authentication status
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };

    checkAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      pickupTime: "10:00",
      returnTime: "10:00",
      driverOption: "self",
      driverId: null,
    },
  });

  const calculateTotalDays = () => {
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    if (!startDate || !endDate) return 1;

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const calculateTotal = () => {
    const days = calculateTotalDays();
    const basePrice = vehicleToUse.price * days;
    const driverFee =
      form.watch("driverOption") === "provided" ? 150000 * days : 0;
    return basePrice + driverFee;
  };

  const calculateDeposit = () => {
    return calculateTotal() * 0.3;
  };

  // Function to validate UUID format
  function isValidUUID(uuid: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    );
  }

  const onSubmit = async (data: FormValues) => {
    if (isSubmitting) return; // Mencegah double submit
    setIsSubmitting(true);

    try {
      // Build service name for cart
      const serviceName = `${vehicleToUse.make} ${vehicleToUse.model} ${vehicleToUse.year ? `(${vehicleToUse.year})` : ""} - ${calculateTotalDays()} day(s)`;

      // Build cart item details
      const cartItemDetails = {
        vehicleId: vehicleToUse.id,
        make: vehicleToUse.make,
        model: vehicleToUse.model,
        year: vehicleToUse.year,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        pickupTime: data.pickupTime,
        returnTime: data.returnTime,
        driverOption: data.driverOption,
        driverId: data.driverId,
        totalDays: calculateTotalDays(),
        basePrice: vehicleToUse.price * calculateTotalDays(),
        driverFee:
          data.driverOption === "provided" ? 150000 * calculateTotalDays() : 0,
      };

      // Add to cart using the shopping cart hook
      await addToCart({
        item_type: "car",
        item_id: vehicleToUse.id.toString(),
        service_name: serviceName,
        price: calculateTotal(),
        quantity: 1,
        details: cartItemDetails,
      });

      console.log("✅ Car rental added to cart");
      console.log("🛒 Redirecting to cart for checkout");

      // Redirect to cart page
      navigate("/cart");
    } catch (error) {
      console.error("Error adding car rental to cart:", error);
      alert(
        `There was an error adding the car rental to your cart: ${error.message}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      const isValid = await form.trigger([
        "startDate",
        "endDate",
        "pickupTime",
        "returnTime",
        "driverOption",
      ]);

      // Additional validation for driver selection when "provided" option is selected
      if (isValid) {
        if (
          form.watch("driverOption") === "provided" &&
          !form.watch("driverId")
        ) {
          form.setError("driverId", {
            type: "manual",
            message: "Please select a driver",
          });
          return;
        }
        setStep(2); // Maju ke Step 2 (Confirm Page)
      }
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // If showPickupCustomer is true, show the pickup customer form
  if (showPickupCustomer) {
    return (
      <PickupCustomer
        bookingId={bookingId}
        vehicleId={vehicleToUse.id.toString()}
        customerName="Customer Name" // This would be fetched from the user profile in a real app
        vehicleDetails={vehicleToUse}
        onComplete={(data) => {
          // After pickup is confirmed, proceed to inspection
          setShowInspection(true);
          setShowPickupCustomer(false);
        }}
        onCancel={() => {
          // Go back to booking form
          setShowPickupCustomer(false);
        }}
      />
    );
  }

  // If showInspection is true, we should redirect to the inspection form
  if (showInspection) {
    // In a real app, this would be a navigation to the inspection page
    // For now, we'll just show a message
    return (
      <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Proceed to Inspection
          </CardTitle>
          <CardDescription>
            Your booking has been completed successfully. Please proceed to the
            pre-rental inspection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Booking Details</h3>
              <p>
                <strong>Booking ID:</strong> {bookingId}
              </p>
              <p>
                <strong>Vehicle:</strong> {vehicleToUse.make}{" "}
                {vehicleToUse.model}{" "}
                {vehicleToUse.year && `(${vehicleToUse.year})`}
              </p>
              <p>
                <strong>Pickup Date:</strong>{" "}
                {format(form.getValues("startDate"), "PPP")}
              </p>
              <p>
                <strong>Return Date:</strong>{" "}
                {format(form.getValues("endDate"), "PPP")}
              </p>
            </div>
            <div className="flex justify-center">
              <Button
                className="w-full max-w-md"
                onClick={() => {
                  // In a real app, this would navigate to the inspection page
                  window.location.href = `/inspection?vehicleId=${vehicleToUse.id}&bookingId=${bookingId}`;
                }}
              >
                Start Pre-Rental Inspection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Book Your Rental</CardTitle>
        <CardDescription>
          {selectedVehicle ? (
            <>
              Complete the form below to book{" "}
              <strong>
                {vehicleToUse.make} {vehicleToUse.model}{" "}
                {vehicleToUse.year && `(${vehicleToUse.year})`}
              </strong>{" "}
              for your trip.
            </>
          ) : (
            <>
              Please select a vehicle first or complete the form below to book
              the default vehicle.
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {selectedVehicle && (
          <div className="mb-6 p-4 bg-muted rounded-lg flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-20 overflow-hidden rounded-md">
              <img
                src={
                  vehicleToUse.image ||
                  "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80"
                }
                alt={`${vehicleToUse.make} ${vehicleToUse.model}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80";
                }}
              />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm text-gray-700">
                <strong>Make:</strong> {vehicleToUse.make || "Unknown"}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Model:</strong> {vehicleToUse.model || "Unknown"}
              </p>
              {vehicleToUse.license_plate && (
                <p className="text-sm text-gray-700">
                  <strong>Plate:</strong> {vehicleToUse.license_plate}
                </p>
              )}
              {vehicleToUse.category && (
                <p className="text-sm text-gray-700">
                  <strong>Category:</strong> {vehicleToUse.category}
                </p>
              )}
              <p className="text-sm text-gray-800 font-semibold">
                {formatCurrency(vehicleToUse.price || 0)}/day
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                {/* Date Selection Section - Refactored for responsive grid layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Pickup Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Return Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < form.watch("startDate")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Time Selection Section - Refactored for responsive grid layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="pickupTime"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Pickup Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            id="pickupTime"
                            name="pickupTime"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="returnTime"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Return Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            id="returnTime"
                            name="returnTime"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {vehicleToUse?.isWithDriver ? (
                  <>
                    <FormItem>
                      <FormLabel>Driver Option</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This vehicle is only available{" "}
                        <strong>With Driver</strong>.
                      </p>
                      <input
                        type="hidden"
                        value="provided"
                        {...form.register("driverOption")}
                      />
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="driverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Driver</FormLabel>
                          <Select
                            disabled
                            value={
                              vehicleToUse.assignedDriver?.id || "unavailable"
                            }
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger
                                id="assignedDriver"
                                name="assignedDriver"
                              >
                                <SelectValue placeholder="Driver Assigned" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem
                                value={
                                  vehicleToUse.assignedDriver?.id ||
                                  "unavailable"
                                }
                              >
                                {vehicleToUse.assignedDriver?.name ||
                                  "No Driver Assigned"}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="driverOption"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Driver Option</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === "self") {
                                  form.setValue("driverId", null);
                                }
                              }}
                              defaultValue={field.value}
                              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                <FormControl>
                                  <RadioGroupItem value="self" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer w-full">
                                  Self-drive
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                <FormControl>
                                  <RadioGroupItem value="provided" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer w-full">
                                  With driver (+Rp 150.000/day)
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {form.watch("driverOption") === "provided" &&
                  !vehicleToUse?.isWithDriver && (
                    <FormField
                      control={form.control}
                      name="driverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Driver</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger
                                id="selectDriver"
                                name="selectDriver"
                              >
                                <SelectValue placeholder="Select a driver" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingDrivers ? (
                                <SelectItem value="loading" disabled>
                                  Loading drivers...
                                </SelectItem>
                              ) : availableDrivers.length > 0 ? (
                                availableDrivers.map((driver) => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    {driver.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>
                                  No drivers available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <BookingSummary
                  vehicleMake={vehicleToUse.make}
                  vehicleModel={vehicleToUse.model}
                  vehicleYear={vehicleToUse.year}
                  totalDays={calculateTotalDays()}
                  basePrice={vehicleToUse.price * calculateTotalDays()}
                  driverFee={
                    form.watch("driverOption") === "provided"
                      ? 150000 * calculateTotalDays()
                      : 0
                  }
                  totalAmount={calculateTotal()}
                  depositAmount={calculateDeposit()}
                  isPartialPayment={false}
                />

                <BookingSummary
                  vehicleMake={vehicleToUse.make}
                  vehicleModel={vehicleToUse.model}
                  vehicleYear={vehicleToUse.year}
                  totalDays={calculateTotalDays()}
                  basePrice={vehicleToUse.price * calculateTotalDays()}
                  driverFee={
                    form.watch("driverOption") === "provided"
                      ? 150000 * calculateTotalDays()
                      : 0
                  }
                  totalAmount={calculateTotal()}
                  depositAmount={calculateDeposit()}
                  isPartialPayment={false}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6">
              {step === 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    console.log("Navigating back to vehicle selection");
                    navigate(-1);
                  }}
                  className="flex items-center justify-center gap-1 w-full sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="w-full sm:w-auto"
                >
                  Back
                </Button>
              )}

              {step === 1 ? (
                isAuthenticated ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full sm:w-auto sm:ml-auto"
                    onClick={() => {
                      alert(
                        "Please sign in or register to continue with your booking.",
                      );
                    }}
                  >
                    Please Sign In to Continue{" "}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )
              ) : (
                <Button
                  type="submit"
                  className="w-full sm:w-auto sm:ml-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding to Cart..." : "Add to Cart"}
                  {!isSubmitting && <Check className="ml-2 h-4 w-4" />}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;
