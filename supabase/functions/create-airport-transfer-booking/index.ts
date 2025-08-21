// create-booking Edge Function
// This function creates bookings after successful payment based on booking type

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

type Database = any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateBookingRequest {
  paymentId: string;
  cartItemDetails: {
    codeBooking: string;
    customerName: string;
    customerPhone: string;
    customerId: string;
    vehicleType?: string;
    fromAddress?: string;
    toAddress?: string;
    fromLocation?: [number, number];
    toLocation?: [number, number];
    pickupDate?: string;
    pickupTime?: string;
    distance?: string;
    duration?: string;
    passenger?: number;
    bookingType: string;
    driverId?: string | null;
    id_driver?: number | null;
    driverName?: string;
    driverPhone?: string;
    vehicleName?: string;
    vehicleModel?: string;
    vehiclePlate?: string;
    vehicleMake?: string;
    finalPrice: number;
    vehiclePricePerKm?: number;
    basicPrice?: number;
    surcharge?: number;
    // Additional fields for different booking types
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
    flightNumber?: string;
    size?: string;
    weight?: number;
    serviceName?: string;
    location?: string;
    extraBaggageCount?: number;
  };
}

Deno.serve(async (req) => {
  console.log(
    "[CreateBooking] Function invoked at:",
    new Date().toISOString(),
  );

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables for Supabase connection");
    }

    // Create Supabase client with admin privileges
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestBody: CreateBookingRequest = await req.json();
    console.log(
      "[CreateBooking] Request body:",
      JSON.stringify(requestBody, null, 2),
    );

    const { paymentId, cartItemDetails } = requestBody;

    if (!paymentId || !cartItemDetails) {
      throw new Error("Missing required fields: paymentId and cartItemDetails");
    }

    if (!cartItemDetails.bookingType) {
      throw new Error("Missing required field: bookingType");
    }

    // Verify payment exists and is completed
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("status", "completed")
      .single();

    if (paymentError || !paymentData) {
      throw new Error(`Payment ${paymentId} not found or not completed`);
    }

    console.log(
      "[CreateBooking] Payment verified:",
      paymentData.id,
    );

    // Generate UUID for the booking
    const bookingId = crypto.randomUUID();
    
    let createdBooking: any;
    let tableName: string;
    let bookingData: any;

    // Handle different booking types
    switch (cartItemDetails.bookingType) {
      case "rentcar":
        tableName = "bookings";
        bookingData = {
          id: bookingId,
          user_id: cartItemDetails.customerId,
          vehicle_id: cartItemDetails.vehicleId || null,
          start_date: cartItemDetails.startDate || cartItemDetails.pickupDate,
          end_date: cartItemDetails.endDate || cartItemDetails.pickupDate,
          status: "confirmed",
          total_price: cartItemDetails.finalPrice,
          created_at: new Date().toISOString(),
        };
        break;

      case "airport_transfer":
        tableName = "airport_transfer";
        bookingData = {
          id: bookingId,
          user_id: cartItemDetails.customerId,
          pickup_location: cartItemDetails.fromAddress,
          dropoff_location: cartItemDetails.toAddress,
          flight_number: cartItemDetails.flightNumber || "",
          date: cartItemDetails.pickupDate,
          passenger_count: cartItemDetails.passenger || 1,
          total_price: cartItemDetails.finalPrice,
          status: "confirmed",
          // Additional fields for compatibility
          code_booking: cartItemDetails.codeBooking,
          customer_name: cartItemDetails.customerName,
          phone: cartItemDetails.customerPhone,
          pickup_date: cartItemDetails.pickupDate,
          pickup_time: cartItemDetails.pickupTime,
          type: cartItemDetails.vehicleType,
          price: cartItemDetails.finalPrice,
          passenger: cartItemDetails.passenger,
          driver_id: cartItemDetails.driverId || null,
          id_driver: cartItemDetails.id_driver || null,
          driver_name: cartItemDetails.driverName || "",
          payment_method: paymentData.payment_method,
          distance: cartItemDetails.distance,
          duration: cartItemDetails.duration,
          license_plate: cartItemDetails.vehiclePlate || "N/A",
          model: cartItemDetails.vehicleModel || "N/A",
          make: cartItemDetails.vehicleMake || "N/A",
          vehicle_name: cartItemDetails.vehicleType,
          customer_id: cartItemDetails.customerId,
          from_location: cartItemDetails.fromLocation,
          to_location: cartItemDetails.toLocation,
          created_by_role: "customer",
          created_at: new Date().toISOString(),
        };
        break;

      case "baggage":
        tableName = "baggage_booking";
        bookingData = {
          id: bookingId,
          user_id: cartItemDetails.customerId,
          size: cartItemDetails.size || "medium",
          weight: cartItemDetails.weight || 0,
          price: cartItemDetails.finalPrice,
          status: "confirmed",
          booking_date: cartItemDetails.pickupDate || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        };
        break;

      case "handling":
        tableName = "handling_bookings";
        bookingData = {
          id: bookingId,
          user_id: cartItemDetails.customerId,
          service_name: cartItemDetails.serviceName || "Passenger Handling",
          location: cartItemDetails.location || cartItemDetails.fromAddress,
          passenger_count: cartItemDetails.passenger || 1,
          date: cartItemDetails.pickupDate || new Date().toISOString().split('T')[0],
          basic_price: cartItemDetails.basicPrice || cartItemDetails.finalPrice,
          total_price: cartItemDetails.finalPrice,
          status: "confirmed",
          extra_baggage_count: cartItemDetails.extraBaggageCount || 0,
          created_at: new Date().toISOString(),
        };
        break;

      default:
        throw new Error(`Unsupported booking type: ${cartItemDetails.bookingType}`);
    }

    console.log(
      `[CreateBooking] Creating ${cartItemDetails.bookingType} booking:`,
      JSON.stringify(bookingData, null, 2),
    );

    // Check if booking already exists for this payment
    const { data: existingBooking, error: existingError } = await supabase
      .from(tableName)
      .select("id")
      .eq("id", bookingId)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing booking:", existingError);
      throw existingError;
    }

    if (existingBooking) {
      console.log(
        `[CreateBooking] Booking already exists in ${tableName}:`,
        existingBooking.id,
      );

      // Update payment_bookings table to link this payment to the existing booking
      const { error: linkError } = await supabase
        .from("payment_bookings")
        .upsert({
          payment_id: paymentId,
          booking_id: existingBooking.id.toString(),
          booking_type: cartItemDetails.bookingType,
        });

      if (linkError) {
        console.error("Error linking payment to existing booking:", linkError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Booking already exists",
          data: { booking: existingBooking, bookingId: existingBooking.id },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Insert booking into the appropriate table
    const { data: insertedBooking, error: bookingError } = await supabase
      .from(tableName)
      .insert([bookingData])
      .select()
      .single();

    if (bookingError) {
      console.error(`Error creating ${cartItemDetails.bookingType} booking:`, bookingError);
      throw bookingError;
    }

    createdBooking = insertedBooking;

    console.log(
      `[CreateBooking] ${cartItemDetails.bookingType} booking created successfully:`,
      createdBooking.id,
    );

    // Link payment to booking in payment_bookings table
    const { error: linkError } = await supabase
      .from("payment_bookings")
      .insert({
        payment_id: paymentId,
        booking_id: createdBooking.id.toString(),
        booking_type: cartItemDetails.bookingType,
      });

    if (linkError) {
      console.error("Error linking payment to booking:", linkError);
      // Don't fail the entire operation if linking fails
    }

    const successResponse = {
      success: true,
      message: `${cartItemDetails.bookingType} booking created successfully`,
      data: {
        booking: createdBooking,
        bookingId: createdBooking.id,
        payment: paymentData,
      },
    };

    console.log(
      "[CreateBooking] Success:",
      JSON.stringify(successResponse, null, 2),
    );

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CreateBooking] Error:", error);

    const errorResponse = {
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
