import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Car,
  CreditCard,
  FileText,
  RefreshCw,
  Settings,
  Upload,
  User,
  Users,
} from "lucide-react";

interface Booking {
  id: string;
  vehicleName: string;
  vehicleModel?: string;
  vehicleType?: string;
  startDate: Date;
  endDate: Date;
  status: "active" | "completed" | "cancelled";
  totalAmount: number;
  paymentStatus: "paid" | "partial" | "pending";
  imageUrl: string;
  driverName?: string;
  licensePlate?: string;
  bookingCode?: string;
  isAirportTransfer?: boolean;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupTime?: string;
}

const UserDashboard = () => {
  const { userName, userEmail, userRole, userId } = useAuth();
  const userAvatar = "";
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [fullName, setFullName] = useState<string>(userName || "");
  const [address, setAddress] = useState<string>("");
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  // Selfie capture state variables
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Store the setCapturedImage function in the static property
  (UserDashboard as any).setCapturedImage = setCapturedImage;
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

  return (
    <div className="bg-background min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {fullName || userName || userEmail?.split("@")[0] || "Customer"}
              </h1>
              <p className="text-muted-foreground">{userEmail}</p>
              <Badge variant="outline" className="mt-1">
                {userRole}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate("https://angry-bell5-d7kh5.view-3.tempo-dev.app/")
            }
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back To Homepage
          </Button>
        </div>

        <Tabs
          defaultValue="overview"
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {(userRole === "Admin" || userRole === "Manager") && (
              <>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Active Bookings</CardTitle>
                  <CardDescription>Currently active rentals</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBookings ? (
                    <div className="flex justify-center items-center py-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        {activeBookings.length}
                      </div>
                      <Progress
                        value={activeBookings.length > 0 ? 100 : 0}
                        className="mt-2"
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Spent</CardTitle>
                  <CardDescription>All time rental expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBookings ? (
                    <div className="flex justify-center items-center py-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        {formatCurrency(
                          [...activeBookings, ...bookingHistory].reduce(
                            (sum, booking) => sum + booking.totalAmount,
                            0,
                          ),
                        )}
                      </div>
                      <Progress
                        value={
                          [...activeBookings, ...bookingHistory].length > 0
                            ? 75
                            : 0
                        }
                        className="mt-2"
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Upcoming Returns</CardTitle>
                  <CardDescription>Vehicles due for return</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBookings ? (
                    <div className="flex justify-center items-center py-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        {
                          activeBookings.filter(
                            (b) =>
                              new Date(b.endDate).getTime() -
                                new Date().getTime() <
                              3 * 24 * 60 * 60 * 1000,
                          ).length
                        }
                      </div>
                      <Progress
                        value={
                          activeBookings.filter(
                            (b) =>
                              new Date(b.endDate).getTime() -
                                new Date().getTime() <
                              3 * 24 * 60 * 60 * 1000,
                          ).length > 0
                            ? 100
                            : 0
                        }
                        className="mt-2"
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Active Rentals</CardTitle>
                  <CardDescription>
                    Your currently active vehicle rentals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBookings ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : activeBookings.length > 0 ? (
                    <div className="space-y-4">
                      {activeBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg"
                        >
                          <div className="w-full md:w-1/4 h-40 rounded-md overflow-hidden">
                            <img
                              src={booking.imageUrl}
                              alt={booking.vehicleName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <Badge className="mb-2">
                                  {booking.isAirportTransfer
                                    ? "Airport Transfer"
                                    : booking.isBaggageBooking
                                      ? "Baggage Storage"
                                      : "Rentcar"}
                                </Badge>
                                <h3 className="text-lg font-semibold">
                                  {booking.vehicleName}
                                </h3>
                              </div>
                              <Badge
                                className={`${booking.status.toLowerCase() === "pending" || booking.status.toLowerCase() === "booked" ? "bg-pink-500" : ""}`}
                              >
                                {booking.status.toLowerCase() === "pending"
                                  ? "Booked"
                                  : booking.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {booking.isBaggageBooking
                                    ? "Baggage Items"
                                    : "Vehicle Model1"}
                                </p>
                                <p className="font-medium">
                                  {booking.vehicleModel || booking.vehicleName}
                                </p>
                              </div>
                              {booking.vehicleType && (
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    {booking.isBaggageBooking
                                      ? "Storage"
                                      : "Vehicle Type"}
                                  </p>
                                  <p className="font-medium">
                                    {booking.vehicleType}
                                  </p>
                                </div>
                              )}
                              {!booking.isBaggageBooking && (
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    License Plate
                                  </p>
                                  <p className="font-medium">
                                    {booking.licensePlate || "-"}
                                  </p>
                                </div>
                              )}
                              {!booking.isBaggageBooking && (
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Driver Name
                                  </p>
                                  <p className="font-medium">
                                    {booking.driverName}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Booking Code
                                </p>
                                <p className="font-medium">
                                  {booking.bookingCode}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {booking.isAirportTransfer
                                    ? "Pickup Date & Time"
                                    : booking.isBaggageBooking
                                      ? "Storage Period"
                                      : "Pickup Date"}
                                </p>
                                <p className="font-medium">
                                  {formatDate(booking.startDate)}
                                  {booking.isAirportTransfer &&
                                  booking.pickupTime
                                    ? `, ${booking.pickupTime}`
                                    : ""}
                                  {booking.isBaggageBooking && booking.startTime
                                    ? ` ${booking.startTime}`
                                    : ""}
                                  {!booking.isAirportTransfer &&
                                  !booking.isBaggageBooking
                                    ? ` - ${formatDate(booking.endDate)}`
                                    : booking.isBaggageBooking
                                      ? ` - ${formatDate(booking.endDate)}${booking.endTime ? ` ${booking.endTime}` : ""}`
                                      : ""}
                                </p>
                              </div>
                              {booking.isAirportTransfer && (
                                <>
                                  <div className="md:col-span-3">
                                    <p className="text-sm text-muted-foreground">
                                      Pickup Location
                                    </p>
                                    <p className="font-medium">
                                      {booking.pickupLocation || "-"}
                                    </p>
                                  </div>
                                  <div className="md:col-span-3">
                                    <p className="text-sm text-muted-foreground">
                                      Dropoff Location
                                    </p>
                                    <p className="font-medium">
                                      {booking.dropoffLocation || "-"}
                                    </p>
                                  </div>
                                </>
                              )}
                              {booking.isBaggageBooking && (
                                <>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Baggage Size
                                    </p>
                                    <p className="font-medium capitalize">
                                      {booking.baggageSize?.replace("_", " ") ||
                                        "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Duration
                                    </p>
                                    <p className="font-medium">
                                      {booking.duration} {booking.durationType}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Airport
                                    </p>
                                    <p className="font-medium">
                                      {booking.airport || "-"}
                                    </p>
                                  </div>
                                  {booking.flightNumber && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Flight Number
                                      </p>
                                      <p className="font-medium">
                                        {booking.flightNumber}
                                      </p>
                                    </div>
                                  )}
                                  {booking.baggageSize === "electronic" &&
                                    booking.itemName && (
                                      <div>
                                        <p className="text-sm text-muted-foreground">
                                          Item Name
                                        </p>
                                        <p className="font-medium">
                                          {booking.itemName}
                                        </p>
                                      </div>
                                    )}
                                </>
                              )}
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Total Amount
                                </p>
                                <p className="font-medium">
                                  {formatCurrency(booking.totalAmount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Payment Status
                                </p>
                                <p className="font-medium capitalize">
                                  {booking.paymentStatus}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Payment Method
                                </p>
                                <p className="font-medium capitalize">
                                  {booking.paymentMethod || "-"}
                                </p>
                              </div>
                            </div>
                            {!booking.isBaggageBooking && (
                              <div className="flex gap-2 mt-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  <FileText size={14} />
                                  View Details
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => {
                                    if (
                                      booking.status === "approved" &&
                                      booking.pickupStatus === "picked_up"
                                    ) {
                                      window.location.href = `/inspection?vehicleId=${booking.vehicleId}&bookingId=${booking.id}`;
                                    } else {
                                      alert(
                                        "Vehicle must be approved and picked up before inspection",
                                      );
                                    }
                                  }}
                                >
                                  <Car size={14} />
                                  {booking.status === "approved" &&
                                  booking.pickupStatus === "picked_up"
                                    ? "Pre-Rental Inspection"
                                    : "Return Vehicle"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Car className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-lg font-medium">
                        No active rentals
                      </h3>
                      <p className="text-muted-foreground">
                        Book a vehicle to get started
                      </p>
                      <Button className="mt-4">Book a Vehicle</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Calendar</CardTitle>
                  <CardDescription>Your rental schedule</CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                  <div className="mt-4">
                    <h4 className="font-medium">Upcoming Events</h4>
                    <div className="mt-2 space-y-2">
                      {isLoadingBookings ? (
                        <div className="flex justify-center items-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : activeBookings.length > 0 ? (
                        activeBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted"
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${getStatusColor(booking.status)}`}
                            ></div>
                            <span className="flex-1">
                              {booking.vehicleName} Return
                            </span>
                            <span className="text-muted-foreground">
                              {formatDate(booking.endDate)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-2 text-sm text-muted-foreground">
                          No upcoming events
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings1</CardTitle>
                <CardDescription>
                  View and manage all your vehicle rentals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Active Bookings</h3>
                    <select
                      className="p-2 border rounded-md mr-2"
                      onChange={(e) => {
                        const status = e.target.value;
                        // This is a placeholder for actual filtering logic
                        // In a real implementation, you would filter the bookings based on status
                        console.log(`Filter by status: ${status}`);
                      }}
                    >
                      <option value="all">All Status</option>
                      <option value="booked">Booked</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="onride">Onride</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <Button variant="outline" size="sm">
                      Apply Filter
                    </Button>
                  </div>

                  {isLoadingBookings ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : activeBookings.length > 0 ? (
                    activeBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg"
                      >
                        <div className="w-full md:w-1/5 h-32 rounded-md overflow-hidden">
                          <img
                            src={booking.imageUrl}
                            alt={booking.vehicleName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge className="mb-2">
                                {booking.isAirportTransfer
                                  ? "Airport Transfer"
                                  : booking.isBaggageBooking
                                    ? "Baggage Storage"
                                    : "Rentcar"}
                              </Badge>
                              <h3 className="text-lg font-semibold">
                                {booking.vehicleName}
                              </h3>
                            </div>
                            <Badge
                              className={`${booking.status.toLowerCase() === "pending" || booking.status.toLowerCase() === "booked" ? "bg-pink-500" : ""}`}
                            >
                              {booking.status.toLowerCase() === "pending"
                                ? "Booked"
                                : booking.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                            {!booking.isBaggageBooking && (
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  License Plate
                                </p>
                                <p className="font-medium">
                                  {booking.licensePlate || "-"}
                                </p>
                              </div>
                            )}
                            {booking.vehicleType && (
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {booking.isBaggageBooking
                                    ? "Storage"
                                    : "Vehicle Type"}
                                </p>
                                <p className="font-medium">
                                  {booking.vehicleType}
                                </p>
                              </div>
                            )}

                            {!booking.isBaggageBooking && (
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Driver Name
                                </p>
                                <p className="font-medium">
                                  {booking.driverName}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Booking Code
                              </p>
                              <p className="font-medium">
                                {booking.bookingCode}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {booking.isAirportTransfer
                                  ? "Pickup Date & Time"
                                  : booking.isBaggageBooking
                                    ? "Storage Period"
                                    : "Pickup Date"}
                              </p>
                              <p className="font-medium">
                                {formatDate(booking.startDate)}
                                {booking.isAirportTransfer && booking.pickupTime
                                  ? `, ${booking.pickupTime}`
                                  : ""}
                                {booking.isBaggageBooking && booking.startTime
                                  ? ` ${booking.startTime}`
                                  : ""}
                                {!booking.isAirportTransfer &&
                                !booking.isBaggageBooking
                                  ? ` - ${formatDate(booking.endDate)}`
                                  : booking.isBaggageBooking
                                    ? ` - ${formatDate(booking.endDate)}${booking.endTime ? ` ${booking.endTime}` : ""}`
                                    : ""}
                              </p>
                            </div>
                            {booking.isAirportTransfer && (
                              <>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Pickup Location
                                  </p>
                                  <p className="font-medium">
                                    {booking.pickupLocation || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Dropoff Location
                                  </p>
                                  <p className="font-medium">
                                    {booking.dropoffLocation || "-"}
                                  </p>
                                </div>
                              </>
                            )}
                            {booking.isBaggageBooking && (
                              <>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Baggage Size
                                  </p>
                                  <p className="font-medium capitalize">
                                    {booking.baggageSize?.replace("_", " ") ||
                                      "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Airport
                                  </p>
                                  <p className="font-medium">
                                    {booking.airport || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Terminal
                                  </p>
                                  <p className="font-medium">
                                    {booking.terminal || "-"}
                                  </p>
                                </div>
                              </>
                            )}
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Amount
                              </p>
                              <p className="font-medium">
                                {formatCurrency(booking.totalAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Payment Status
                              </p>
                              <p className="font-medium capitalize">
                                {booking.paymentStatus}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Payment Method
                              </p>
                              <p className="font-medium capitalize">
                                {booking.paymentMethod || "-"}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                            {!booking.isBaggageBooking && (
                              <Button size="sm">Manage Booking</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Car className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-lg font-medium">
                        No bookings found
                      </h3>
                      <p className="text-muted-foreground">
                        You don't have any active bookings
                      </p>
                      <Button className="mt-4">Book a Vehicle</Button>
                    </div>
                  )}

                  {bookingHistory.length > 0 && (
                    <>
                      <Separator className="my-6" />

                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Booking History</h3>
                      </div>

                      {isLoadingBookings ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        bookingHistory.map((booking) => (
                          <div
                            key={booking.id}
                            className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg"
                          >
                            <div className="w-full md:w-1/5 h-32 rounded-md overflow-hidden">
                              <img
                                src={booking.imageUrl}
                                alt={booking.vehicleName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <h3 className="text-lg font-semibold">
                                  {booking.vehicleName}
                                </h3>
                                <Badge variant="outline">
                                  {booking.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    {booking.isAirportTransfer
                                      ? "Airport Transfer"
                                      : booking.isBaggageBooking
                                        ? "Baggage Storage"
                                        : "Rentcar"}
                                  </p>
                                  <p className="font-medium">
                                    {formatDate(booking.startDate)}
                                    {booking.pickupTime
                                      ? `, ${booking.pickupTime}`
                                      : booking.startTime
                                        ? ` ${booking.startTime}`
                                        : ""}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Total Amount
                                  </p>
                                  <p className="font-medium">
                                    {formatCurrency(booking.totalAmount)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Payment Method
                                  </p>
                                  <p className="font-medium capitalize">
                                    {booking.paymentMethod}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Payment Status
                                  </p>
                                  <p className="font-medium capitalize">
                                    {booking.paymentStatus}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button size="sm" variant="outline">
                                  View Receipt
                                </Button>
                                <Button size="sm" variant="outline">
                                  Book Again
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View all your payment transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingBookings ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : [...activeBookings, ...bookingHistory].length > 0 ? (
                    [...activeBookings, ...bookingHistory].map((booking) => (
                      <div
                        key={booking.id}
                        className="flex justify-between items-center p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-muted">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {booking.vehicleName} Rental
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(booking.startDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(booking.totalAmount)}
                          </p>
                          <Badge
                            variant={
                              booking.paymentStatus === "paid"
                                ? "default"
                                : "outline"
                            }
                            className="mt-1"
                          >
                            {booking.paymentStatus === "paid"
                              ? "Paid"
                              : booking.paymentStatus === "partial"
                                ? "Partially Paid"
                                : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-lg font-medium">
                        No payment history
                      </h3>
                      <p className="text-muted-foreground">
                        You haven't made any payments yet
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/3 flex flex-col items-center">
                    <Avatar className="h-32 w-32 border-2 border-primary">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Selfie Capture Section - Only for Customer role */}
                    {userRole === "Customer" && (
                      <div className="w-full mt-4 space-y-4">
                        {uploadError && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{uploadError}</span>
                          </div>
                        )}

                        <div
                          className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
                          style={{ minHeight: "200px" }}
                        >
                          {stream ? (
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                              style={{
                                transform: "scaleX(-1)",
                                backgroundColor: "#000",
                                width: "100%",
                                height: "100%",
                              }}
                            />
                          ) : capturedImage ? (
                            <img
                              src={capturedImage}
                              alt="Captured selfie"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full bg-muted">
                              <Camera className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}

                          <canvas
                            ref={canvasRef}
                            className="hidden"
                            width="1280"
                            height="720"
                            style={{ position: "absolute", top: 0, left: 0 }}
                          />
                        </div>

                        <div className="flex flex-col space-y-2 w-full">
                          {!isCapturing && !capturedImage ? (
                            <>
                              <Button
                                onClick={startCamera}
                                type="button"
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                <Camera className="mr-2 h-4 w-4" /> Mulai Kamera
                              </Button>
                              <div className="relative w-full">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  id="file-upload"
                                  className="hidden"
                                  onChange={handleFileUpload}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() =>
                                    document
                                      .getElementById("file-upload")
                                      ?.click()
                                  }
                                >
                                  <Upload className="mr-2 h-4 w-4" /> Upload
                                  Foto
                                </Button>
                              </div>
                            </>
                          ) : isCapturing ? (
                            <Button
                              onClick={captureImage}
                              type="button"
                              className="w-full bg-green-500 hover:bg-green-600 text-white"
                            >
                              Ambil Foto
                            </Button>
                          ) : capturedImage ? (
                            <div className="flex flex-col space-y-2">
                              <Button
                                onClick={uploadSelfie}
                                type="button"
                                className="w-full bg-green-500 hover:bg-green-600 text-white"
                                disabled={isUploading}
                              >
                                {isUploading ? "Uploading..." : "Save Photo"}
                              </Button>
                              <Button
                                onClick={() => {
                                  setCapturedImage(null);
                                  setUploadError(null);
                                }}
                                type="button"
                                variant="outline"
                                className="w-full"
                              >
                                <RefreshCw className="mr-2 h-4 w-4" /> Ambil
                                Ulang
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {userRole !== "Customer" && (
                      <Button variant="outline" className="mt-4">
                        Change Photo
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Full Name</label>
                        <input
                          type="text"
                          className="w-full p-2 mt-1 border rounded-md"
                          value={fullName || userName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <input
                          type="email"
                          className="w-full p-2 mt-1 border rounded-md"
                          value={userEmail}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          className="w-full p-2 mt-1 border rounded-md"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <textarea
                        className="w-full p-2 mt-1 border rounded-md h-24"
                        placeholder="Enter your address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline">Cancel</Button>
                      <Button
                        onClick={async () => {
                          try {
                            if (!userId) return;

                            let updateSuccess = false;

                            // First update auth.users metadata as the primary source of truth
                            const { error: authUpdateError } =
                              await supabase.functions.invoke(
                                "update-user-metadata",
                                {
                                  body: {
                                    userId: userId,
                                    userData: {
                                      full_name: fullName,
                                      phone_number: phoneNumber,
                                      name: fullName, // Also update name field for compatibility
                                      address: address,
                                      selfie_url: capturedImage,
                                    },
                                  },
                                },
                              );

                            if (authUpdateError) {
                              console.error(
                                "Error updating auth user metadata:",
                                authUpdateError,
                              );
                            } else {
                              console.log(
                                "Auth user metadata updated successfully",
                              );

                              // Update local storage with new user data
                              const authUserStr =
                                localStorage.getItem("auth_user");
                              if (authUserStr) {
                                try {
                                  const authUser = JSON.parse(authUserStr);
                                  authUser.name = fullName;
                                  localStorage.setItem(
                                    "auth_user",
                                    JSON.stringify(authUser),
                                  );
                                  localStorage.setItem("userName", fullName);
                                } catch (e) {
                                  console.error(
                                    "Error updating auth_user in localStorage:",
                                    e,
                                  );
                                }
                              }
                            }

                            // Then update database tables for backward compatibility
                            // For Customer role, update both customers and users tables
                            if (userRole === "Customer") {
                              // Update customers table with both full_name and name fields
                              const { error: customerError } = await supabase
                                .from("customers")
                                .update({
                                  full_name: fullName,
                                  name: fullName, // Also update the name column
                                  phone: phoneNumber,
                                  address: address,
                                })
                                .eq("id", userId);

                              // Also update users table for consistency
                              const { error: userError } = await supabase
                                .from("users")
                                .update({
                                  full_name: fullName,
                                  phone_number: phoneNumber,
                                  address: address,
                                })
                                .eq("id", userId);

                              if (
                                !customerError &&
                                !userError &&
                                !authUpdateError
                              )
                                updateSuccess = true;
                            } else {
                              // For non-Customer roles, update users table
                              const { error } = await supabase
                                .from("users")
                                .update({
                                  full_name: fullName,
                                  phone_number: phoneNumber,
                                  address: address,
                                })
                                .eq("id", userId);

                              if (!error && !authUpdateError)
                                updateSuccess = true;
                            }

                            if (updateSuccess) {
                              alert("Profile updated successfully!");
                            } else {
                              alert(
                                "Failed to update profile. Please try again.",
                              );
                            }
                          } catch (error) {
                            console.error("Error updating profile:", error);
                            alert(
                              "An error occurred while updating your profile.",
                            );
                          }
                        }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(userRole === "Admin" || userRole === "Manager") && (
            <>
              <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>
                        Manage system users and their roles
                      </CardDescription>
                    </div>
                    <Button className="flex items-center gap-1">
                      <User size={16} />
                      Add User
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Search users..."
                            className="p-2 border rounded-md w-64"
                          />
                          <Button variant="outline">Search</Button>
                        </div>
                        <div className="flex gap-2">
                          <select className="p-2 border rounded-md">
                            <option>All Roles</option>
                            <option>Admin</option>
                            <option>Manager</option>
                            <option>Supervisor</option>
                            <option>Staff</option>
                            <option>HRD</option>
                          </select>
                          <Button variant="outline">Filter</Button>
                        </div>
                      </div>

                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-3 text-left">Name</th>
                              <th className="p-3 text-left">Email</th>
                              <th className="p-3 text-left">Role</th>
                              <th className="p-3 text-left">Status</th>
                              <th className="p-3 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>JD</AvatarFallback>
                                  </Avatar>
                                  <span>John Doe</span>
                                </div>
                              </td>
                              <td className="p-3">john.doe@example.com</td>
                              <td className="p-3">Admin</td>
                              <td className="p-3">
                                <Badge variant="default">Active</Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500"
                                  >
                                    Disable
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>JS</AvatarFallback>
                                  </Avatar>
                                  <span>Jane Smith</span>
                                </div>
                              </td>
                              <td className="p-3">jane.smith@example.com</td>
                              <td className="p-3">Manager</td>
                              <td className="p-3">
                                <Badge variant="default">Active</Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500"
                                  >
                                    Disable
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>RJ</AvatarFallback>
                                  </Avatar>
                                  <span>Robert Johnson</span>
                                </div>
                              </td>
                              <td className="p-3">robert.j@example.com</td>
                              <td className="p-3">Staff</td>
                              <td className="p-3">
                                <Badge variant="outline">Inactive</Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-500"
                                  >
                                    Enable
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          Showing 3 of 24 users
                        </p>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled>
                            Previous
                          </Button>
                          <Button size="sm" variant="outline">
                            1
                          </Button>
                          <Button size="sm" variant="outline">
                            2
                          </Button>
                          <Button size="sm" variant="outline">
                            3
                          </Button>
                          <Button size="sm" variant="outline">
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vehicles" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Vehicle Inventory</CardTitle>
                      <CardDescription>
                        Manage your vehicle fleet
                      </CardDescription>
                    </div>
                    <Button className="flex items-center gap-1">
                      <Car size={16} />
                      Add Vehicle
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Search vehicles..."
                            className="p-2 border rounded-md w-64"
                          />
                          <Button variant="outline">Search</Button>
                        </div>
                        <div className="flex gap-2">
                          <select className="p-2 border rounded-md">
                            <option>All Types</option>
                            <option>Sedan</option>
                            <option>SUV</option>
                            <option>MPV</option>
                            <option>Hatchback</option>
                          </select>
                          <select className="p-2 border rounded-md">
                            <option>All Status</option>
                            <option>Available</option>
                            <option>Rented</option>
                            <option>Maintenance</option>
                          </select>
                          <Button variant="outline">Filter</Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="h-48 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80"
                              alt="Toyota Avanza"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold">Toyota Avanza</h3>
                              <Badge>Available</Badge>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Type:
                                </span>{" "}
                                MPV
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Rate:
                                </span>{" "}
                                {formatCurrency(150000)}/day
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  License:
                                </span>{" "}
                                B 1234 XYZ
                              </p>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                              <Button size="sm">View Details</Button>
                            </div>
                          </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                          <div className="h-48 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80"
                              alt="Honda Brio"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold">Honda Brio</h3>
                              <Badge variant="outline">Rented</Badge>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Type:
                                </span>{" "}
                                Hatchback
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Rate:
                                </span>{" "}
                                {formatCurrency(120000)}/day
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  License:
                                </span>{" "}
                                B 5678 ABC
                              </p>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                              <Button size="sm">View Details</Button>
                            </div>
                          </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                          <div className="h-48 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80"
                              alt="Suzuki Ertiga"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold">Suzuki Ertiga</h3>
                              <Badge variant="destructive">Maintenance</Badge>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Type:
                                </span>{" "}
                                MPV
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Rate:
                                </span>{" "}
                                {formatCurrency(140000)}/day
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  License:
                                </span>{" "}
                                B 9012 DEF
                              </p>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                              <Button size="sm">View Details</Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          Showing 3 of 15 vehicles
                        </p>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled>
                            Previous
                          </Button>
                          <Button size="sm" variant="outline">
                            1
                          </Button>
                          <Button size="sm" variant="outline">
                            2
                          </Button>
                          <Button size="sm" variant="outline">
                            3
                          </Button>
                          <Button size="sm" variant="outline">
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;