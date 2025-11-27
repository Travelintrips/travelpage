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
  ShoppingCart,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate, toISOString, formatCurrency } from "@/lib/utils";
//import { useAuth } from "@/hooks/useAuth";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

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
  bookingType: z.string().default("rental"),
});

type FormValues = z.infer<typeof formSchema>;

import { Vehicle } from "@/hooks/useVehicleData";

interface BookingVehicle extends Vehicle {
  isWithDriver?: boolean;
  assignedDriver?: {
    id: string;
    name: string;
  };
  category?: string;
  fuel_type?: "petrol" | "diesel" | "electric" | "hybrid";
}

interface BookingFormProps {
  selectedVehicle?: BookingVehicle | null;
  onBookingComplete?: (bookingData: any) => void;
}

export default function BookingForm({ selectedVehicle: selectedVehicleProp, onClose }: BookingFormProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
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
  const [vehicles, setVehicles] = useState<BookingVehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<BookingVehicle | null>(selectedVehicleProp || null);

  // Use selected vehicle from state or props
  const vehicleToUse = selectedVehicle || vehicles.find((v) => v.id === selectedVehicleProp?.id);

  // Debug logging
  useEffect(() => {
    console.log("🚗 BookingForm Debug:", {
      selectedVehicleProp,
      selectedVehicle,
      vehicleToUse,
      vehiclesCount: vehicles.length
    });
  }, [selectedVehicleProp, selectedVehicle, vehicleToUse, vehicles]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = localStorage.getItem("userId");
        const authUser = localStorage.getItem("auth_user");
        
        const isLoggedIn = !!(session?.user || userId || authUser);
        setIsAuthenticated(isLoggedIn);
        
        console.log("🔐 Auth Check:", {
          hasSession: !!session?.user,
          hasUserId: !!userId,
          hasAuthUser: !!authUser,
          isAuthenticated: isLoggedIn
        });
      } catch (error) {
        console.error("Error checking auth:", error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch available drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      setIsLoadingDrivers(true);
      try {
        const { data, error } = await supabase
  .from("drivers")
  .select("id, name, phone_number, is_online, driver_status")
  .or("is_online.eq.true,driver_status.eq.standby")
  .order("name");

        if (error) {
          console.error("Error fetching drivers:", error);
          toast({
            title: "Error",
            description: "Failed to load drivers",
            variant: "destructive",
          });
          return;
        }

        console.log("✅ Drivers loaded:", data);
        setAvailableDrivers(data || []);
      } catch (error) {
        console.error("Error fetching drivers:", error);
      } finally {
        setIsLoadingDrivers(false);
      }
    };

    fetchDrivers();
  }, [toast]);

  
  // Check if user role is allowed to create bookings
  const allowedRoles = ["Customer", "Admin", "Super Admin", "Staff", "user"];

  
  useEffect(() => {
    if (!allowedRoles.includes(userRole)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create bookings.",
        variant: "destructive",
      });
    }
  }, [userRole, toast]);
  
  if (!allowedRoles.includes(userRole)) {
    return null;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      pickupTime: "10:00",
      returnTime: "10:00",
      driverOption: "self",
      driverId: null,
      bookingType: "rental",
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
    if (!vehicleToUse) return 0;
    const days = calculateTotalDays();
    const basePrice = (vehicleToUse.daily_rate || vehicleToUse.price || 0) * days;
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
    // Form submission is now handled by individual buttons
    // This function can be left empty or removed
  };

  function generateBookingCode() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 digit

  return `RC-${year}${month}${day}-${randomDigits}`;
}


  const handleAddToCart = async () => {
    const data = form.getValues();
    if (!data || isSubmitting) return;
    if (!vehicleToUse) {
      alert("Please select a vehicle first");
      return;
    }
    setIsSubmitting(true);

    try {
      // Build service name for cart with vehicle details
      const serviceName = `${vehicleToUse.make} ${vehicleToUse.model} ${
  vehicleToUse.year ? `(${vehicleToUse.year})` : ""
} - ${vehicleToUse.license_plate}`;


      // Get driver info if driver is selected
      const selectedDriver = data.driverOption === "provided" && data.driverId
        ? availableDrivers.find(d => d.id === data.driverId)
        : null;

      // Build cart item details
      const cartItemDetails = {
        vehicleId: vehicleToUse.id,
        code_booking: generateBookingCode(),
        make: vehicleToUse.make,
        model: vehicleToUse.model,
        year: vehicleToUse.year,
        licensePlate: vehicleToUse.license_plate,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        pickupTime: data.pickupTime,
        returnTime: data.returnTime,
        bookingType: data.bookingType,
        driverOption: data.driverOption,
        driverId: data.driverId,
        driverName: selectedDriver?.name,
        driverPhone: selectedDriver?.phone_number,
        totalDays: calculateTotalDays(),
        basePrice: (vehicleToUse.daily_rate || vehicleToUse.price || 0) * calculateTotalDays(),
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
        booking_type: "rental",
        code_booking: generateBookingCode(),
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

  const handleContinueBooking = () => {
    const data = form.getValues();
    // Navigate to payment page with booking data
    if (data && vehicleToUse) {
      const bookingData = {
        vehicleId: vehicleToUse.id,
        make: vehicleToUse.make,
        model: vehicleToUse.model,
        year: vehicleToUse.year,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        pickupTime: data.pickupTime,
        returnTime: data.returnTime,
        bookingType: data.bookingType,
        driverOption: data.driverOption,
        driverId: data.driverId,
        totalDays: calculateTotalDays(),
        totalAmount: calculateTotal(),
      };
      navigate("/payments", { state: { bookingData, vehicleData: vehicleToUse } });
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
              <h3 className="font-medium mb-2">Booking Details1</h3>
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
        {isLoadingVehicles ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : !vehicleToUse ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No vehicle selected. Please select a vehicle from the list.</p>
          </div>
        ) : (
          <>
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
                  <strong>License Plate:</strong> {vehicleToUse.license_plate}
                </p>
              )}
              {vehicleToUse.category && (
                <p className="text-sm text-gray-700">
                  <strong>Category:</strong> {vehicleToUse.category}
                </p>
              )}
              <p className="text-sm text-gray-800 font-semibold">
                {formatCurrency(vehicleToUse.daily_rate || vehicleToUse.price || 0)}/day
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
                  basePrice={(vehicleToUse.daily_rate || vehicleToUse.price || 0) * calculateTotalDays()}
                  driverFee={
                    form.watch("driverOption") === "provided"
                      ? 150000 * calculateTotalDays()
                      : 0
                  }
                  totalAmount={calculateTotal()}
                  depositAmount={calculateDeposit()}
                  isPartialPayment={false}
                  startDate={form.watch("startDate") ? form.watch("startDate").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : undefined}
                  endDate={form.watch("endDate") ? form.watch("endDate").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : undefined}
                  pickupTime={form.watch("pickupTime")}
                  returnTime={form.watch("returnTime")}
                  driverName={
                    form.watch("driverOption") === "provided" && form.watch("driverId")
                      ? availableDrivers.find(d => d.id === form.watch("driverId"))?.name
                      : undefined
                  }
                  driverPhone={
                    form.watch("driverOption") === "provided" && form.watch("driverId")
                      ? availableDrivers.find(d => d.id === form.watch("driverId"))?.phone_number
                      : undefined
                  }
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6">
              {step === 1 ? (
  <Button
    type="button"
    variant="outline"
    onClick={() => {
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
                    Next1
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
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                    onClick={handleAddToCart}
                    disabled={isSubmitting || !form.formState.isValid}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {isSubmitting ? "Adding..." : "Add to Cart"}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                    onClick={handleContinueBooking}
                    disabled={!form.formState.isValid}
                  >
                    <CreditCard className="h-4 w-4" />
                    Continue Booking
                  </Button>
                </div>
              )}
            </div>
          </form>
        </Form>
        </>
        )}
      </CardContent>
    </Card>
  );
}