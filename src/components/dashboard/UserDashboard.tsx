// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Globe,
  Hotel,
  Luggage,
  MapPin,
  Package,
  Plane,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Train,
  TrendingUp,
  Upload,
  Wallet,
  Zap,
} from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const _formatDate = (date: Date) =>
  date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const _formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const _getInitials = (name?: string | null) => {
  if (!name || typeof name !== "string") return "NA";
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
};

const _statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active:     { label: "Active",      color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  confirmed:  { label: "Confirmed",   color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  pending:    { label: "Pending",     color: "bg-amber-100 text-amber-700",     dot: "bg-amber-500"   },
  booked:     { label: "Booked",      color: "bg-blue-100 text-blue-700",       dot: "bg-blue-500"    },
  processing: { label: "Processing",  color: "bg-blue-100 text-blue-700",       dot: "bg-blue-500"    },
  "in progress":{ label: "In Progress",color: "bg-purple-100 text-purple-700",  dot: "bg-purple-500"  },
  inprogress: { label: "In Progress", color: "bg-purple-100 text-purple-700",   dot: "bg-purple-500"  },
  onride:     { label: "On Ride",     color: "bg-purple-100 text-purple-700",   dot: "bg-purple-500"  },
  completed:  { label: "Completed",   color: "bg-slate-100 text-slate-600",     dot: "bg-slate-400"   },
  cancelled:  { label: "Cancelled",   color: "bg-red-100 text-red-600",         dot: "bg-red-400"     },
  paid:       { label: "Paid",        color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  partial:    { label: "Partial",     color: "bg-amber-100 text-amber-700",     dot: "bg-amber-500"   },
  unpaid:     { label: "Unpaid",      color: "bg-red-100 text-red-600",         dot: "bg-red-400"     },
};

// Service type label + icon mapping
const _serviceTypeConfig: Record<string, { label: string; icon: React.ElementType; iconColor: string; bg: string }> = {
  "airport transfer": { label: "Airport Transfer", icon: Plane,       iconColor: "text-sky-500",    bg: "bg-sky-50"    },
  "baggage storage":  { label: "Baggage",          icon: Luggage,     iconColor: "text-violet-500", bg: "bg-violet-50" },
  "handling":         { label: "Handling",         icon: ShieldCheck, iconColor: "text-teal-500",   bg: "bg-teal-50"   },
  "car rental":       { label: "Car Rental",       icon: Car,         iconColor: "text-orange-500", bg: "bg-orange-50" },
  "cargo":            { label: "Cargo",            icon: Package,     iconColor: "text-amber-500",  bg: "bg-amber-50"  },
  "flight":           { label: "Flight",           icon: Plane,       iconColor: "text-sky-500",    bg: "bg-sky-50"    },
  "hotel":            { label: "Hotel",            icon: Hotel,       iconColor: "text-rose-500",   bg: "bg-rose-50"   },
  "train":            { label: "Train",            icon: Train,       iconColor: "text-indigo-500", bg: "bg-indigo-50" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = _statusConfig[status?.toLowerCase()] || { label: status, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const _ServiceIcon = ({ booking }: { booking: any }) => {
  if (booking.isAirportTransfer) return <Plane       className="w-4 h-4 text-sky-500"    />;
  if (booking.isBaggageBooking)  return <Luggage     className="w-4 h-4 text-violet-500" />;
  if (booking.isHandlingBooking) return <ShieldCheck className="w-4 h-4 text-teal-500"   />;
  return <Car className="w-4 h-4 text-orange-500" />;
};

const _serviceLabel = (b: any) => {
  if (b.isAirportTransfer) return "Airport Transfer";
  if (b.isBaggageBooking)  return "Baggage Storage";
  if (b.isHandlingBooking) return "Handling";
  return "Car Rental";
};

const _quickServices = [
  { label: "Car Rental",       icon: Car,        color: "bg-orange-50 text-orange-600", href: "/rentcar"          },
  { label: "Airport Transfer", icon: Plane,       color: "bg-sky-50 text-sky-600",       href: "/airport-transfer" },
  { label: "Baggage",          icon: Luggage,     color: "bg-violet-50 text-violet-600", href: "/baggage"          },
  { label: "Handling",         icon: ShieldCheck, color: "bg-teal-50 text-teal-600",     href: "/handling"         },
  { label: "Cargo",            icon: Package,     color: "bg-amber-50 text-amber-600",   href: "/cargo"            },
  { label: "More",             icon: Globe,       color: "bg-slate-50 text-slate-600",   href: "/"                 },
];

const BookingCard = ({ booking }: { booking: any }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-[#16a07c]/30 hover:bg-[#16a07c]/[0.02] transition-all duration-200">
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
      <_ServiceIcon booking={booking} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm text-slate-800 truncate">{booking.vehicleName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{_serviceLabel(booking)} · {booking.bookingCode || "-"}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />{_formatDate(booking.startDate)}
          </span>
          {booking.pickupLocation && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{booking.pickupLocation}</span>
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-slate-700">{_formatCurrency(booking.totalAmount)}</span>
      </div>
    </div>
  </div>
);

const UserDashboard = () => {
  const { userName, userEmail, userRole, userId } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [fullName, setFullName]       = useState<string>(userName || "");
  const [address, setAddress]         = useState<string>("");
  const navigate = useNavigate();

  const [uploadError,     setUploadError]     = useState<string | null>(null);
  const [capturedImage,   setCapturedImage]   = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved,    setProfileSaved]    = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch user profile information from database
  useEffect(() => {
    const fetchUserProfileData = async () => {
      if (!userId) return;

      try {
        // First try to get data from auth.users metadata using the edge function
        try {
          const { data: authUserData, error: authUserError } =
            await supabase.functions.invoke("update-user-metadata", {
              body: {
                userId: userId,
                action: "get",
              },
            });

          if (!authUserError && authUserData?.user) {
            console.log("Auth user data found:", authUserData.user);

            // Get user metadata
            const userMetadata = authUserData.user.user_metadata || {};

            // Set profile data from metadata if available
            if (userMetadata.full_name) {
              setFullName(userMetadata.full_name);
              console.log(
                "Setting full name from auth metadata:",
                userMetadata.full_name,
              );
            }

            if (userMetadata.phone_number) {
              setPhoneNumber(userMetadata.phone_number);
              console.log(
                "Setting phone from auth metadata:",
                userMetadata.phone_number,
              );
            }

            if (userMetadata.address) {
              setAddress(userMetadata.address);
              console.log(
                "Setting address from auth metadata:",
                userMetadata.address,
              );
            }

            if (userMetadata.selfie_url) {
              setCapturedImage(userMetadata.selfie_url);
              console.log(
                "Setting selfie from auth metadata:",
                userMetadata.selfie_url,
              );
            }

            // If we got all the data we need from auth metadata, return early
            if (userMetadata.full_name && userMetadata.phone_number) {
              return;
            }
          }
        } catch (error) {
          console.error(
            "Error fetching user metadata from edge function:",
            error,
          );
          // Continue to fallback methods
        }

        // If auth metadata is incomplete, check database tables as fallback

        // Check which table to query based on user role
        if (userRole === "Customer") {
          // First try customers table for Customer role
          const { data: customerData, error: customerError } = await supabase
            .from("customers")
            .select("phone, full_name, selfie_url, address")
            .eq("id", userId)
            .single();

          if (!customerError && customerData) {
            if (customerData.phone && !phoneNumber) {
              setPhoneNumber(customerData.phone);
            }
            if (customerData.full_name && !fullName) {
              setFullName(customerData.full_name);
              console.log(
                "Setting customer full name:",
                customerData.full_name,
              );
            }
            if (customerData.selfie_url && !capturedImage) {
              setCapturedImage(customerData.selfie_url);
            }
            if (customerData.address && !address) {
              setAddress(customerData.address);
            }
            console.log("Fetched customer data:", customerData);
            return;
          }
        }

        // For non-Customer roles or as fallback, check users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("phone_number, full_name, selfie_url, address")
          .eq("id", userId)
          .single();

        if (!userError && userData) {
          if (userData.phone_number && !phoneNumber) {
            setPhoneNumber(userData.phone_number);
          }
          if (userData.full_name && !fullName) {
            setFullName(userData.full_name);
            console.log("Setting user full name:", userData.full_name);
          }
          if (userData.selfie_url && !capturedImage) {
            setCapturedImage(userData.selfie_url);
          }
          if (userData.address && !address) {
            setAddress(userData.address);
          }
          console.log("Fetched user data:", userData);
          return;
        }

        // If still not found, check drivers table
        if (userRole === "Driver Mitra" || userRole === "Driver Perusahaan") {
          const { data: driverData, error: driverError } = await supabase
            .from("drivers")
            .select("phone, selfie_url, address, full_name")
            .eq("id", userId)
            .single();

          if (!driverError && driverData) {
            if (driverData.phone && !phoneNumber) {
              setPhoneNumber(driverData.phone);
            }
            if (driverData.selfie_url && !capturedImage) {
              setCapturedImage(driverData.selfie_url);
            }
            if (driverData.address && !address) {
              setAddress(driverData.address);
            }
            if (driverData.full_name && !fullName) {
              setFullName(driverData.full_name);
              console.log("Setting driver full name:", driverData.full_name);
            }
            console.log("Fetched driver data:", driverData);
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching user profile data:", error);
      }
    };

    fetchUserProfileData();
  }, [userId, userRole, phoneNumber, fullName, address, capturedImage]);
  const [activeTab, setActiveTab] = useState("overview");

  // State for storing real booking data from Supabase
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [baggageBookings, setBaggageBookings] = useState<any[]>([]);
  const [handlingBookings, setHandlingBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);

  // Fetch real booking data from Supabase
  useEffect(() => {
    const fetchBookings = async () => {
      if (!userId) return;

      setIsLoadingBookings(true);
      try {
        // Fetch bookings for this user with vehicle details
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(
            `
            id, 
            start_date,
            license_plate, 
            end_date, 
            status, 
            total_amount, 
            payment_status,
            vehicle_id,
            driver_name,
            kode_booking,
            vehicles!inner (id, name, image_url, make, model, image),
            payments (payment_method)
          `,
          )
          .eq("user_id", userId);

        // Fetch airport transfer data for this user
        const { data: airportTransferData, error: airportTransferError } =
          await supabase
            .from("airport_transfer")
            .select(
              `
        id,
        pickup_location,
        dropoff_location,
        pickup_date,
        pickup_time,
        license_plate,
        price,
        status,
        payment_method,
        driver_name,
        code_booking,
        customer_id,
        vehicle_name,
        type,
        model,
        driver:driver_id (id, name)
        vehicles:vehicle_id (id, image, image_url, name, make, model)
      `,
            )
            .eq("customer_id", userId);

        // Fetch baggage booking data for this user with payment information
        const { data: baggageBookingData, error: baggageBookingError } =
          await supabase
            .from("baggage_booking")
            .select(
              `
        id,
        booking_id,
        customer_name,
        customer_phone,
        customer_email,
        flight_number,
        baggage_size,
        item_name,
        price,
        duration,
        duration_type,
        hours,
        start_date,
        end_date,
        start_time,
        end_time,
        airport,
        terminal,
        storage_location,
        status,
        payment_method,
        created_at,
        updated_at,
        payments!left (payment_method)
      `,
            )
            .eq("customer_id", userId)
            .order("created_at", { ascending: false });

        // Fetch handling booking data for this user with payment information
        const { data: handlingBookingsData, error: handlingBookingsError } =
          await supabase
            .from("handling_bookings")
            .select(
              `
        id,
        travel_type,
        code_booking,
        customer_name,
        customer_phone,
        customer_email,
        flight_number,
        price,
        status,
        payment_method,
        pickup_date,
        pickup_time,
        created_at,
        updated_at,
        passenger_area,
        pickup_area,
        created_by_role
        
      `,
            )
            .eq("user_id", userId)
            .eq("created_by_role", userRole)
            .order("created_at", { ascending: false });

        // Check if we have any actual data (not just null or empty arrays)
        const hasBookings = bookingsData && bookingsData.length > 0;
        const hasAirportTransfers = airportTransferData && airportTransferData.length > 0;
        const hasBaggageBookings = baggageBookingData && baggageBookingData.length > 0;
        const hasHandlingBookings = handlingBookingsData && handlingBookingsData.length > 0;

        console.log("Data check:", {
          hasBookings,
          hasAirportTransfers, 
          hasBaggageBookings,
          hasHandlingBookings,
          bookingsData: bookingsData?.length || 0,
          airportTransferData: airportTransferData?.length || 0,
          baggageBookingData: baggageBookingData?.length || 0,
          handlingBookingsData: handlingBookingsData?.length || 0
        });

        // Always process the data, even if some arrays are empty
        console.log("Fetched bookings:", bookingsData);
        console.log("Fetched airport transfers:", airportTransferData);
        console.log("Fetched baggage bookings:", baggageBookingData);
        console.log("Fetched handling bookings:", handlingBookingsData);

        if (airportTransferError) {
          console.error(
            "Error fetching airport transfers:",
            airportTransferError,
          );
        }

        if (baggageBookingError) {
          console.error(
            "Error fetching baggage bookings:",
            baggageBookingError,
          );
        }

        if (handlingBookingsError) {
          console.error(
            "Error fetching handling bookings:",
            handlingBookingsError,
          );
        }

        // Transform the bookings data to match our component's expected format
        const formattedBookings = (bookingsData || []).map((booking) => {
          // Create a proper vehicle name from make and model if available
          let vehicleName = "Unknown Vehicle";
          let vehicleModel = "";
          if (booking.vehicles) {
            if (booking.vehicles.make && booking.vehicles.model) {
              vehicleName = `${booking.vehicles.make} ${booking.vehicles.model}`;
              vehicleModel = booking.vehicles.model;
            } else if (booking.vehicles.name) {
              vehicleName = booking.vehicles.name;
            }
          }

          // Get the image URL directly from the vehicles.image field
          let imageUrl =
            "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80";

          // First priority: use the image field if available
          if (booking.vehicles?.image) {
            imageUrl = booking.vehicles.image;
            console.log("Using image from vehicles.image:", imageUrl);
          }
          // Second priority: use image_url if available
          else if (booking.vehicles?.image_url) {
            imageUrl = booking.vehicles.image_url;
            console.log("Using image from vehicles.image_url:", imageUrl);
          }

          return {
            id: booking.id.toString(),
            vehicleName: vehicleName,
            startDate: booking.start_date
              ? new Date(booking.start_date)
              : new Date(),
            endDate: booking.end_date
              ? new Date(booking.end_date)
              : new Date(),
            status: booking.status || "active",
            totalAmount: booking.total_amount || 0,
            paymentStatus: booking.payment_status || "pending",
            imageUrl: imageUrl,
            vehicleId: booking.vehicle_id,
            licensePlate: booking.license_plate || "-",
            driverName: booking.driver_name || "Unknown Driver",
            bookingCode: booking.kode_booking || "-",
            pickupStatus: booking.pickup_status || "not_picked_up",
            paymentMethod:
              booking.payments && booking.payments[0]
                ? booking.payments[0].payment_method
                : "-",
          };
        });

        // Transform the airport transfer data
        const formattedAirportTransfers = (airportTransferData || []).map(
          (transfer) => {
            // Create a proper vehicle name from available fields
            let vehicleName = "Unknown Vehicle";
            let vehicleModel = "";
            let vehicleType = "";

            // Get vehicle model if available
            if (transfer.model) {
              vehicleModel = transfer.model;
            } else if (transfer.vehicles?.model) {
              vehicleModel = transfer.vehicles.model;
            }

            // Get vehicle type if available
            if (transfer.type) {
              vehicleType = transfer.type;
            }

            // First try to use vehicle_name field directly from airport_transfer
            if (transfer.vehicle_name) {
              vehicleName = transfer.vehicle_name;
            }
            // Then try to use model and type fields from airport_transfer
            else if (vehicleModel && vehicleType) {
              vehicleName = `${vehicleModel} (${vehicleType})`;
            }
            // Finally fall back to vehicles relation if available
            else if (transfer.vehicles) {
              if (transfer.vehicles.make && transfer.vehicles.model) {
                vehicleName = `${transfer.vehicles.make} ${transfer.vehicles.model}`;
              } else if (transfer.vehicles.name) {
                vehicleName = transfer.vehicles.name;
              }
            }

            // Get the image URL directly from the vehicles.image field
            let imageUrl =
              "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80";

            // First priority: use the image field if available
            if (transfer.vehicles?.image) {
              imageUrl = transfer.vehicles.image;
            }
            // Second priority: use image_url if available
            else if (transfer.vehicles?.image_url) {
              imageUrl = transfer.vehicles.image_url;
            }

            return {
              id: transfer.id.toString(),
              vehicleName: vehicleName,
              vehicleModel: vehicleModel || "",
              vehicleType: vehicleType || "",
              startDate: transfer.pickup_date
                ? new Date(transfer.pickup_date)
                : new Date(),
              endDate: transfer.pickup_date
                ? new Date(transfer.pickup_date)
                : new Date(),
              status: transfer.status || "active",
              totalAmount: transfer.total_amount || transfer.price || 0,
              paymentStatus: transfer.payment_method
                ? transfer.payment_method.toLowerCase() === "cash"
                  ? "pending"
                  : "paid"
                : "pending",
              imageUrl: imageUrl,
              vehicleId: transfer.vehicle_id,
              licensePlate: transfer.license_plate || "-",
              driverName:
                transfer.driver_name ||
                transfer.driver?.name ||
                "Unknown Driver",
              bookingCode: transfer.booking_code || "-",
              pickupStatus: "not_picked_up",
              isAirportTransfer: true,
              pickupLocation: transfer.pickup_location || "",
              dropoffLocation: transfer.dropoff_location || "",
              paymentMethod: transfer.payment_method || "-",
              pickupTime: transfer.pickup_time || "",
            };
          },
        );

        // Transform the baggage booking data
        const formattedBaggageBookings = (baggageBookingData || []).map(
          (booking) => {
            // Get payment method from payments table if available, otherwise from booking record
            const paymentMethod =
              booking.payments && booking.payments.length > 0
                ? booking.payments[0].payment_method
                : booking.payment_method || "-";

            return {
              id: booking.id.toString(),
              vehicleName: `Baggage Storage - ${booking.baggage_size.replace("_", " ").toUpperCase()}`,
              vehicleModel: booking.baggage_size.replace("_", " "),
              vehicleType: "Baggage Storage",
              startDate: booking.start_date
                ? new Date(booking.start_date)
                : new Date(),
              endDate: booking.end_date
                ? new Date(booking.end_date)
                : new Date(),
              status: booking.status || "pending",
              totalAmount: booking.price || 0,
              paymentStatus:
                booking.status === "confirmed" ? "paid" : "pending",
              imageUrl:
                "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
              licensePlate: "-",
              driverName: "-",
              bookingCode: booking.booking_id || "-",
              pickupStatus: "not_applicable",
              isBaggageBooking: true,
              baggageSize: booking.baggage_size,
              duration: booking.duration,
              durationType: booking.duration_type,
              airport: booking.airport,
              terminal: booking.terminal,
              storageLocation: booking.storage_location,
              flightNumber: booking.flight_number,
              customerName: booking.customer_name,
              customerPhone: booking.customer_phone,
              customerEmail: booking.customer_email,
              itemName: booking.item_name,
              startTime: booking.start_time,
              endTime: booking.end_time,
              paymentMethod: paymentMethod,
            };
          },
        );

        // Transform the handling booking data
        const formattedHandlingBookings = (handlingBookingsData || []).map(
          (booking) => {
            return {
              id: booking.id.toString(),
              vehicleName: `Handling Service - ${booking.travel_type || 'Unknown'}`,
              vehicleModel: booking.travel_type || '',
              vehicleType: "Handling Service",
              startDate: booking.pickup_date
                ? new Date(booking.pickup_date)
                : new Date(),
              endDate: booking.pickup_date
                ? new Date(booking.pickup_date)
                : new Date(),
              status: booking.status || "pending",
              totalAmount: booking.price || 0,
              paymentStatus:
                booking.status === "confirmed" ? "paid" : "pending",
              imageUrl:
                "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
              licensePlate: "-",
              driverName: "-",
              bookingCode: booking.code_booking || "-",
              pickupStatus: "not_applicable",
              isHandlingBooking: true,
              travelType: booking.travel_type,
              customerName: booking.customer_name,
              customerPhone: booking.customer_phone,
              customerEmail: booking.customer_email,
              flightNumber: booking.flight_number,
              pickupTime: booking.pickup_time,
              pickupArea: booking.pickup_area,
              passengerArea: booking.passenger_area,
              paymentMethod: booking.payment_method || "-",
            };
          },
        );

        // Store baggage bookings separately
        setBaggageBookings(formattedBaggageBookings);
        
        // Store handling bookings separately
        setHandlingBookings(formattedHandlingBookings);

        // Combine all booking types
        const allBookings = [
          ...formattedBookings,
          ...formattedAirportTransfers,
          ...formattedBaggageBookings,
          ...formattedHandlingBookings,
        ];

        console.log("All combined bookings:", allBookings);

        // Split into active and history based on status
        const active = allBookings.filter(
          (b) =>
            b.status.toLowerCase() === "active" ||
            b.status.toLowerCase() === "confirmed" ||
            b.status.toLowerCase() === "pending" ||
            b.status.toLowerCase() === "booked" ||
            b.status.toLowerCase() === "onride",
        );

        const history = allBookings.filter(
          (b) =>
            b.status.toLowerCase() === "completed" ||
            b.status.toLowerCase() === "cancelled",
        );

        console.log("Active bookings:", active);
        console.log("History bookings:", history);

        setActiveBookings(active);
        setBookingHistory(history);
      } catch (error) {
        console.error("Error in fetchBookings:", error);
      } finally {
        setIsLoadingBookings(false);
      }
    };

    fetchBookings();
  }, [userId]);

  // Fallback data in case there are no bookings yet
  const defaultBookings = [
    {
      id: "1",
      vehicleName: "Toyota Avanza",
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "active",
      totalAmount: 450000,
      paymentStatus: "partial",
      imageUrl:
        "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "confirmed":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      case "paid":
        return "bg-green-500";
      case "partial":
        return "bg-yellow-500";
      case "pending":
      case "booked":
        return "bg-pink-500";
      case "onride":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name || typeof name !== "string") return "NA";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  function base64ToArrayBuffer(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Function to upload selfie to Supabase Storage directly
  const uploadSelfie = async () => {
    if (!capturedImage || !userId) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Generate unique file name with user ID to avoid conflicts
      const fileName = `selfie_${userId}_${Date.now()}.jpg`;

      // Extract base64 data from the string 'data:image/jpeg;base64,...'
      const base64Data = capturedImage.split(",")[1];

      // Convert base64 to Blob for upload
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      // Use edge function to upload selfie instead of direct storage access
      const { data: uploadData, error: uploadError } =
        await supabase.functions.invoke("supabase-functions-uploadSelfie", {
          body: {
            base64Image: base64Data,
            fileName: fileName,
          },
        });

      if (uploadError || !uploadData) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError?.message || "Upload failed.");
      }

      const selfieUrl = uploadData.publicUrl;
      console.log("Selfie URL:", selfieUrl);

      // First update auth.users metadata with the selfie URL
      const { error: authUpdateError } = await supabase.functions.invoke(
        "update-user-metadata",
        {
          body: {
            userId: userId,
            userData: {
              selfie_url: selfieUrl,
            },
          },
        },
      );

      if (authUpdateError) {
        console.error(
          "Error updating auth user metadata with selfie:",
          authUpdateError,
        );
      } else {
        console.log("Auth user metadata updated with selfie successfully");
      }

      // Then update database tables for backward compatibility
      // Try updating customers table first for Customer role
      if (userRole === "Customer") {
        const { error: customerError } = await supabase
          .from("customers")
          .update({ selfie_url: selfieUrl })
          .eq("id", userId);

        if (customerError) {
          console.error("Error updating customer record:", customerError);

          // Fallback to users table
          const { error: updateError } = await supabase
            .from("users")
            .update({ selfie_url: selfieUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating user record:", updateError);
            throw new Error("Failed to update profile with selfie URL.");
          }
        }
      } else {
        // For non-Customer roles, update users table first
        const { error: updateError } = await supabase
          .from("users")
          .update({ selfie_url: selfieUrl })
          .eq("id", userId);

        if (updateError) {
          console.error("Error updating user record:", updateError);
          throw new Error("Failed to update profile with selfie URL.");
        }
      }

      alert("✅ Selfie berhasil diunggah!");
    } catch (error: any) {
      console.error("❌ Error saat mengunggah selfie:", error);
      setUploadError(error.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // Function to start camera for selfie capture
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      setIsCapturing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setUploadError("Could not access camera. Please check permissions.");
    }
  };

  // Function to capture image from video stream
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Draw the video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageDataUrl);

    // Stop the camera stream
    stream.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsCapturing(false);
  };

  // Function to handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCapturedImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const allOrders       = [...activeBookings, ...bookingHistory];
  const totalSpent      = allOrders.reduce((s, b) => s + b.totalAmount, 0);
  const pendingPayments = allOrders.filter(
    (b) => b.paymentStatus?.toLowerCase() === "pending" || b.paymentStatus?.toLowerCase() === "partial"
  );
  const displayName = fullName || userName || userEmail?.split("@")[0] || "Customer";

  // ── Profile save ──────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!userId) return;
    setIsSavingProfile(true);
    try {
      await supabase.functions.invoke("update-user-metadata", {
        body: { userId, userData: { full_name: fullName, phone_number: phoneNumber, address } },
      });
      if (userRole === "Customer") {
        await supabase.from("customers").update({ full_name: fullName, phone: phoneNumber, address }).eq("id", userId);
      } else {
        await supabase.from("users").update({ full_name: fullName, phone_number: phoneNumber, address }).eq("id", userId);
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#0d6e57] to-[#16a07c] px-6 pt-8 pb-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-4 ring-white/30">
                <AvatarImage src={capturedImage?.startsWith("http") ? capturedImage : undefined} alt={displayName} />
                <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                  {_getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">Welcome back,</p>
              <h1 className="text-2xl font-bold text-white leading-tight">{displayName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-white/60 text-sm">{userEmail}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 text-white/90 text-xs font-medium">
                  {userRole}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Homepage
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-14">
        {/* ── Summary Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {([
            {
              label:   "Total Orders",
              value:   allOrders.length,
              subtext: "Semua layanan yang pernah dipesan",
              icon:    FileText,
              color:   "text-blue-600",
              bg:      "bg-blue-50",
              isText:  false,
            },
            {
              label:   "Active Orders",
              value:   activeBookings.length,
              subtext: "Pesanan yang sedang berjalan",
              icon:    Activity,
              color:   "text-[#16a07c]",
              bg:      "bg-[#16a07c]/10",
              isText:  false,
            },
            {
              label:   "Pending Payment",
              value:   pendingPayments.length,
              subtext: "Menunggu pembayaran customer",
              icon:    CreditCard,
              color:   "text-amber-600",
              bg:      "bg-amber-50",
              isText:  false,
            },
            {
              label:   "Total Spending",
              value:   _formatCurrency(totalSpent),
              subtext: "Total pengeluaran customer",
              icon:    Wallet,
              color:   "text-violet-600",
              bg:      "bg-violet-50",
              isText:  true,
            },
          ] as const).map((s) => (
            <Card key={s.label} className="bg-white border border-slate-100 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`${s.bg} p-2.5 rounded-xl`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
                <p className={`font-bold text-slate-800 ${s.isText ? "text-lg leading-tight" : "text-2xl"}`}>{s.value}</p>
                <p className="text-xs font-semibold text-slate-600 mt-1">{s.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{s.subtext}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Quick Actions ───────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-slate-800 text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {([
              { label: "Book Cargo",        icon: Package,    color: "bg-amber-50",    iconColor: "text-amber-600",    href: "/cargo"            },
              { label: "Airport Transfer",  icon: Plane,      color: "bg-sky-50",      iconColor: "text-sky-600",      href: "/airport-transfer" },
              { label: "Car Rental",        icon: Car,        color: "bg-orange-50",   iconColor: "text-orange-600",   href: "/rentcar"          },
              { label: "Handling Service",  icon: ShieldCheck,color: "bg-teal-50",     iconColor: "text-teal-600",     href: "/handling"         },
              { label: "View Orders",       icon: FileText,   color: "bg-blue-50",     iconColor: "text-blue-600",     href: "#orders"           },
              { label: "Pay Now",           icon: CreditCard, color: "bg-[#16a07c]/10",iconColor: "text-[#16a07c]",    href: "#payments"         },
            ] as const).map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  if (action.href.startsWith("#")) {
                    const tabVal = action.href.slice(1);
                    const trigger = document.querySelector<HTMLButtonElement>(`[data-radix-collection-item][value="${tabVal}"]`);
                    trigger?.click();
                  } else {
                    navigate(action.href);
                  }
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <span className="text-[11px] text-slate-600 font-medium text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-slate-200 rounded-xl p-1 mb-6 inline-flex gap-1 shadow-sm">
            {[
              { value: "overview", label: "Overview"  },
              { value: "orders",   label: "Orders"    },
              { value: "payments", label: "Payments"  },
              { value: "profile",  label: "Profile"   },
            ].map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-[#16a07c] data-[state=active]:text-white data-[state=active]:shadow-none text-slate-500"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Overview ─────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">

            {/* ── Recent Orders Table ─────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
                <div>
                  <h2 className="font-semibold text-slate-800">Recent Orders</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Semua transaksi layanan terbaru</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                    {allOrders.length} orders
                  </Badge>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="flex items-center gap-1 text-xs text-[#16a07c] font-medium hover:underline"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {isLoadingBookings ? (
                <div className="py-14 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#16a07c] border-t-transparent animate-spin" />
                  <p className="text-sm text-slate-400">Memuat pesanan…</p>
                </div>
              ) : allOrders.length === 0 ? (
                /* ── Empty state ─────────────────────────────────────────── */
                <div className="py-16 flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#16a07c]/10 to-[#16a07c]/5 flex items-center justify-center">
                      <Package className="w-9 h-9 text-[#16a07c]/50" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                      <Search className="w-3 h-3 text-amber-600" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 text-base">Belum ada pesanan</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-xs leading-relaxed">
                      Mulai gunakan layanan Travelpage untuk cargo, transfer, handling, dan layanan perjalanan lainnya.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/")}
                    className="mt-1 px-6 py-2.5 rounded-xl bg-[#16a07c] text-white text-sm font-semibold hover:bg-[#0d8a6a] transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    Explore Services
                  </button>
                </div>
              ) : (
                /* ── Table ───────────────────────────────────────────────── */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Order ID</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Service</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Date</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Details</th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Total</th>
                        <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                        <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {allOrders.slice(0, 10).map((b) => {
                        const svcType = _serviceLabel(b).toLowerCase();
                        const svcCfg = _serviceTypeConfig[svcType] || _serviceTypeConfig["car rental"];
                        const Icon = svcCfg.icon;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                {b.bookingCode || `#${String(b.id).slice(0, 8)}`}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg ${svcCfg.bg} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className={`w-3.5 h-3.5 ${svcCfg.iconColor}`} />
                                </div>
                                <span className="text-xs font-medium text-slate-700">{svcCfg.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                              {_formatDate(b.startDate)}
                            </td>
                            <td className="px-4 py-3.5 hidden md:table-cell">
                              <p className="text-xs text-slate-700 font-medium truncate max-w-[160px]">{b.vehicleName}</p>
                              {b.pickupLocation && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />{b.pickupLocation}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="text-xs font-bold text-slate-800">{_formatCurrency(b.totalAmount)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <StatusBadge status={b.status} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => navigate(`/booking/${b.id}`)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#16a07c] hover:text-[#0d8a6a] px-3 py-1.5 rounded-lg border border-[#16a07c]/30 hover:bg-[#16a07c]/5 transition-all"
                              >
                                <Eye className="w-3 h-3" /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {allOrders.length > 10 && (
                    <div className="px-6 py-4 border-t border-slate-100 text-center">
                      <button
                        className="text-sm text-[#16a07c] font-medium hover:underline inline-flex items-center gap-1"
                        onClick={() => setActiveTab("orders")}
                      >
                        Lihat semua {allOrders.length} pesanan <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Active Services ──────────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
                <div>
                  <h2 className="font-semibold text-slate-800">Active Services</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Layanan yang sedang berjalan</p>
                </div>
                <Badge variant="secondary" className="bg-[#16a07c]/10 text-[#16a07c] font-semibold">
                  {activeBookings.length} aktif
                </Badge>
              </div>
              <div className="p-5">
                {isLoadingBookings ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-7 h-7 rounded-full border-2 border-[#16a07c] border-t-transparent animate-spin" />
                  </div>
                ) : activeBookings.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                      <Activity className="w-7 h-7 text-slate-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-500">Tidak ada layanan aktif</p>
                      <p className="text-xs text-slate-400 mt-1">Pesan layanan untuk memulai perjalanan Anda</p>
                    </div>
                    <button
                      onClick={() => navigate("/")}
                      className="px-5 py-2 rounded-xl bg-[#16a07c] text-white text-sm font-semibold hover:bg-[#0d8a6a] transition-colors flex items-center gap-2"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Explore Services
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeBookings.slice(0, 6).map((b) => {
                      const svcType = _serviceLabel(b).toLowerCase();
                      const svcCfg = _serviceTypeConfig[svcType] || _serviceTypeConfig["car rental"];
                      const Icon = svcCfg.icon;
                      return (
                        <div
                          key={b.id}
                          className="flex flex-col gap-3 p-4 rounded-xl border border-slate-100 hover:border-[#16a07c]/30 hover:bg-[#16a07c]/[0.02] transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl ${svcCfg.bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-5 h-5 ${svcCfg.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{svcCfg.label}</p>
                                <StatusBadge status={b.status} />
                              </div>
                              <p className="text-sm font-semibold text-slate-800 truncate">{b.vehicleName}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              {_formatDate(b.startDate)}
                            </div>
                            {b.pickupLocation && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{b.pickupLocation}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-700">{_formatCurrency(b.totalAmount)}</span>
                            <button
                              onClick={() => navigate(`/booking/${b.id}`)}
                              className="text-[11px] text-[#16a07c] font-semibold hover:underline flex items-center gap-0.5"
                            >
                              Detail <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Payment Summary ──────────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
                <div>
                  <h2 className="font-semibold text-slate-800">Payment Summary</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Ringkasan status pembayaran</p>
                </div>
                <button
                  onClick={() => setActiveTab("payments")}
                  className="text-xs font-medium text-[#16a07c] hover:underline flex items-center gap-1"
                >
                  View Payments <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Pending invoices */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-700">{pendingPayments.length}</p>
                      <p className="text-xs font-semibold text-amber-600 mt-0.5">Pending Invoices</p>
                      <p className="text-[11px] text-amber-500">Menunggu pembayaran</p>
                    </div>
                  </div>
                  {/* Paid invoices */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-700">
                        {allOrders.filter((b) => b.paymentStatus?.toLowerCase() === "paid").length}
                      </p>
                      <p className="text-xs font-semibold text-emerald-600 mt-0.5">Paid Invoices</p>
                      <p className="text-[11px] text-emerald-500">Pembayaran selesai</p>
                    </div>
                  </div>
                  {/* Total unpaid */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600 leading-tight">
                        {_formatCurrency(pendingPayments.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0))}
                      </p>
                      <p className="text-xs font-semibold text-red-500 mt-0.5">Total Unpaid</p>
                      <p className="text-[11px] text-red-400">Dari {pendingPayments.length} invoice</p>
                    </div>
                  </div>
                </div>
                {/* Alert banner when there are pending payments */}
                {pendingPayments.length > 0 && (
                  <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          {pendingPayments.length} invoice menunggu pembayaran
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Total: {_formatCurrency(pendingPayments.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0))}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("payments")}
                      className="flex-shrink-0 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap"
                    >
                      Bayar Sekarang
                    </button>
                  </div>
                )}
              </div>
            </div>

          </TabsContent>

          {/* ── Orders ───────────────────────────────────────────────────── */}
          <TabsContent value="orders" className="space-y-6">
            {/* All orders table */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800">Semua Pesanan</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Riwayat lengkap semua layanan</p>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                  {allOrders.length} total
                </Badge>
              </div>
              {isLoadingBookings ? (
                <div className="py-14 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#16a07c] border-t-transparent animate-spin" />
                  <p className="text-sm text-slate-400">Memuat pesanan…</p>
                </div>
              ) : allOrders.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#16a07c]/10 to-[#16a07c]/5 flex items-center justify-center">
                      <Package className="w-9 h-9 text-[#16a07c]/50" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                      <Search className="w-3 h-3 text-amber-600" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 text-base">Belum ada pesanan</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-xs leading-relaxed">
                      Mulai gunakan layanan Travelpage untuk cargo, transfer, handling, dan layanan perjalanan lainnya.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/")}
                    className="mt-1 px-6 py-2.5 rounded-xl bg-[#16a07c] text-white text-sm font-semibold hover:bg-[#0d8a6a] transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    Explore Services
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Order ID</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Service</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Date</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Details</th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Total</th>
                        <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                        <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {allOrders.map((b) => {
                        const svcKey = _serviceLabel(b).toLowerCase();
                        const svcCfg = _serviceTypeConfig[svcKey] || _serviceTypeConfig["car rental"];
                        const Icon = svcCfg.icon;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {b.bookingCode || `#${String(b.id).slice(0, 8)}`}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg ${svcCfg.bg} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className={`w-3.5 h-3.5 ${svcCfg.iconColor}`} />
                                </div>
                                <span className="text-xs font-medium text-slate-700">{svcCfg.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 hidden sm:table-cell">
                              <span className="text-xs text-slate-500 whitespace-nowrap">{_formatDate(b.startDate)}</span>
                            </td>
                            <td className="px-4 py-3.5 hidden lg:table-cell">
                              <p className="text-xs text-slate-700 font-medium truncate max-w-[160px]">{b.vehicleName}</p>
                              {b.pickupLocation && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[160px]">
                                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{b.pickupLocation}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="text-sm font-semibold text-slate-800">{_formatCurrency(b.totalAmount)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <StatusBadge status={b.status} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => navigate(`/booking/${b.id}`)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 hover:bg-[#16a07c]/10 hover:border-[#16a07c]/30 hover:text-[#16a07c] transition-all"
                              >
                                <Eye className="w-3 h-3" />
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Payments ─────────────────────────────────────────────────── */}
          <TabsContent value="payments" className="space-y-6">

            {/* Payment Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-700">{pendingPayments.length}</p>
                  <p className="text-xs font-semibold text-amber-600 mt-0.5">Pending Invoices</p>
                  <p className="text-[11px] text-amber-500">Menunggu pembayaran</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-emerald-700">
                    {allOrders.filter((b) => b.paymentStatus?.toLowerCase() === "paid").length}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">Paid Invoices</p>
                  <p className="text-[11px] text-emerald-500">Pembayaran selesai</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-red-50 border border-red-100 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-red-600 leading-tight">
                    {_formatCurrency(pendingPayments.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0))}
                  </p>
                  <p className="text-xs font-semibold text-red-500 mt-0.5">Total Unpaid</p>
                  <p className="text-[11px] text-red-400">Dari {pendingPayments.length} invoice</p>
                </div>
              </div>
            </div>

            {/* Pending payments alert */}
            {pendingPayments.length > 0 && (
              <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {pendingPayments.length} invoice menunggu pembayaran
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Total: {_formatCurrency(pendingPayments.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0))}
                    </p>
                  </div>
                </div>
                <button className="flex-shrink-0 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap">
                  Bayar Sekarang
                </button>
              </div>
            )}

            {/* All transactions table */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800">Semua Transaksi</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Riwayat lengkap pembayaran</p>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                  {allOrders.length} transaksi
                </Badge>
              </div>
              {isLoadingBookings ? (
                <div className="py-10 flex justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#16a07c] border-t-transparent animate-spin" />
                </div>
              ) : allOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Order ID</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Service</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Date</th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Amount</th>
                        <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Payment Status</th>
                        <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {allOrders.map((b) => {
                        const svcKey = _serviceLabel(b).toLowerCase();
                        const svcCfg = _serviceTypeConfig[svcKey] || _serviceTypeConfig["car rental"];
                        const Icon = svcCfg.icon;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {b.bookingCode || `#${String(b.id).slice(0, 8)}`}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg ${svcCfg.bg} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className={`w-3.5 h-3.5 ${svcCfg.iconColor}`} />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-slate-700">{svcCfg.label}</p>
                                  <p className="text-[11px] text-slate-400 truncate max-w-[100px]">{b.vehicleName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 hidden sm:table-cell">
                              <span className="text-xs text-slate-500 whitespace-nowrap">{_formatDate(b.startDate)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="text-sm font-semibold text-slate-800">{_formatCurrency(b.totalAmount)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <StatusBadge status={b.paymentStatus || "pending"} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => navigate(`/booking/${b.id}`)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 hover:bg-[#16a07c]/10 hover:border-[#16a07c]/30 hover:text-[#16a07c] transition-all"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#16a07c]/10 to-[#16a07c]/5 flex items-center justify-center">
                      <Wallet className="w-9 h-9 text-[#16a07c]/50" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                      <Search className="w-3 h-3 text-amber-600" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 text-base">Belum ada pesanan</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-xs leading-relaxed">
                      Mulai gunakan layanan Travelpage untuk cargo, transfer, handling, dan layanan perjalanan lainnya.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/")}
                    className="mt-1 px-6 py-2.5 rounded-xl bg-[#16a07c] text-white text-sm font-semibold hover:bg-[#0d8a6a] transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    Explore Services
                  </button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Profile ──────────────────────────────────────────────────── */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Avatar card */}
              <div className="bg-white rounded-2xl shadow-sm border-0 overflow-hidden">
                <div className="h-20 bg-gradient-to-r from-[#0d6e57] to-[#16a07c]" />
                <div className="px-6 pb-6 -mt-10">
                  <div className="relative w-20 h-20 mb-4">
                    {capturedImage ? (
                      <img src={capturedImage} alt="Profile" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-[#16a07c]/20 flex items-center justify-center ring-4 ring-white">
                        <span className="text-2xl font-bold text-[#16a07c]">{_getInitials(displayName)}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">{displayName}</h3>
                  <p className="text-sm text-slate-400">{userEmail}</p>
                  <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full bg-[#16a07c]/10 text-[#16a07c] text-xs font-medium">
                    {userRole}
                  </span>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Profile Photo</p>
                    {isCapturing ? (
                      <div className="space-y-2">
                        <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
                        <canvas ref={canvasRef} className="hidden" width={640} height={480} />
                        <Button onClick={captureImageFn} size="sm" className="w-full bg-[#16a07c] hover:bg-[#0d8a6a]">
                          <Camera className="w-4 h-4 mr-2" /> Capture
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={startCamera} size="sm" variant="outline" className="flex-1 text-xs">
                          <Camera className="w-3 h-3 mr-1" /> Camera
                        </Button>
                        <label className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-center gap-1 h-8 px-3 rounded-md border border-input text-xs font-medium hover:bg-accent">
                            <Upload className="w-3 h-3" /> Upload
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    )}
                    {capturedImage && capturedImage.startsWith("data:") && (
                      <Button onClick={uploadSelfie} disabled={isUploading} size="sm" className="w-full bg-[#16a07c] hover:bg-[#0d8a6a]">
                        {isUploading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Uploading…</> : "Save Photo"}
                      </Button>
                    )}
                    {uploadError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{uploadError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit form */}
              <div className="bg-white rounded-2xl shadow-sm border-0 p-6 lg:col-span-2 space-y-5">
                <div>
                  <h2 className="font-semibold text-slate-800">Account Information</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Update your personal details</p>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" className="rounded-xl border-slate-200 focus-visible:ring-[#16a07c]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</Label>
                    <Input value={userEmail || ""} disabled className="rounded-xl border-slate-200 bg-slate-50 text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone Number</Label>
                    <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+62 ..." className="rounded-xl border-slate-200 focus-visible:ring-[#16a07c]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</Label>
                    <Input value={userRole || "Customer"} disabled className="rounded-xl border-slate-200 bg-slate-50 text-slate-400" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Address</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your address" className="rounded-xl border-slate-200 focus-visible:ring-[#16a07c]" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  {profileSaved && (
                    <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />Profile saved successfully
                    </span>
                  )}
                  <Button onClick={saveProfile} disabled={isSavingProfile} className="ml-auto bg-[#16a07c] hover:bg-[#0d8a6a] rounded-xl px-6">
                    {isSavingProfile ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;