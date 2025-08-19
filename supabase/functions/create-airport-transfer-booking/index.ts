// create-airport-transfer-booking Edge Function
// This function creates airport transfer bookings after successful payment

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

type Database = any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateAirportTransferBookingRequest {
  paymentId: string;
  cartItemDetails: {
    codeBooking: string;
    customerName: string;
    customerPhone: string;
    customerId: string;
    vehicleType: string;
    fromAddress: string;
    toAddress: string;
    fromLocation: [number, number];
    toLocation: [number, number];
    pickupDate: string;
    pickupTime: string;
    distance: string;
    duration: string;
    passenger: number;
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
    vehiclePricePerKm: number;
    basicPrice: number;
    surcharge: number;
  };
}

Deno.serve(async (req) => {
  console.log(
    "[CreateAirportTransferBooking] Function invoked at:",
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
    const requestBody: CreateAirportTransferBookingRequest = await req.json();
    console.log(
      "[CreateAirportTransferBooking] Request body:",
      JSON.stringify(requestBody, null, 2),
    );

    const { paymentId, cartItemDetails } = requestBody;

    if (!paymentId || !cartItemDetails) {
      throw new Error("Missing required fields: paymentId and cartItemDetails");
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
      "[CreateAirportTransferBooking] Payment verified:",
      paymentData.id,
    );

    // Check if airport transfer booking already exists for this payment
    // First check by code_booking from cart item details
    const { data: existingBooking, error: existingError } = await supabase
      .from("airport_transfer")
      .select("id, code_booking")
      .eq("code_booking", cartItemDetails.codeBooking)
      .maybeSingle();

    console.log(
      "[CreateAirportTransferBooking] Checking existing booking with code:",
      cartItemDetails.codeBooking,
      "Result:",
      existingBooking,
    );

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing booking:", existingError);
      throw existingError;
    }

    if (existingBooking) {
      console.log(
        "[CreateAirportTransferBooking] Booking already exists:",
        existingBooking.code_booking,
      );

      // Update payment_bookings table to link this payment to the existing booking
      const { error: linkError } = await supabase
        .from("payment_bookings")
        .upsert({
          payment_id: paymentId,
          booking_id: existingBooking.id.toString(),
          booking_type: "airport_transfer",
        });

      if (linkError) {
        console.error("Error linking payment to existing booking:", linkError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Booking already exists",
          data: { booking: existingBooking },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Generate UUID for the booking
    const bookingId = crypto.randomUUID();

    // Create airport transfer booking
    const bookingData = {
      id: bookingId,
      code_booking: cartItemDetails.codeBooking,
      customer_name: cartItemDetails.customerName,
      phone: cartItemDetails.customerPhone,
      pickup_location: cartItemDetails.fromAddress,
      dropoff_location: cartItemDetails.toAddress,
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
      status: "confirmed", // Set as confirmed since payment is completed
      customer_id: cartItemDetails.customerId,
      from_location: cartItemDetails.fromLocation,
      to_location: cartItemDetails.toLocation,
      created_by_role: "customer", // Add created_by_role field
      created_at: new Date().toISOString(),
    };

    console.log(
      "[CreateAirportTransferBooking] Creating booking:",
      JSON.stringify(bookingData, null, 2),
    );

    // Insert booking into airport_transfer table
    const { data: createdBooking, error: bookingError } = await supabase
      .from("airport_transfer")
      .insert([bookingData])
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating airport transfer booking:", bookingError);
      throw bookingError;
    }

    console.log(
      "[CreateAirportTransferBooking] Booking created successfully:",
      createdBooking.id,
    );

    // Link payment to booking in payment_bookings table
    const { error: linkError } = await supabase
      .from("payment_bookings")
      .insert({
        payment_id: paymentId,
        booking_id: createdBooking.id.toString(),
        booking_type: "airport_transfer",
      });

    if (linkError) {
      console.error("Error linking payment to booking:", linkError);
      // Don't fail the entire operation if linking fails
    }

    const successResponse = {
      success: true,
      message: "Airport transfer booking created successfully",
      data: {
        booking: createdBooking,
        payment: paymentData,
      },
    };

    console.log(
      "[CreateAirportTransferBooking] Success:",
      JSON.stringify(successResponse, null, 2),
    );

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CreateAirportTransferBooking] Error:", error);

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
