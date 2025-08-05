// processPayment Edge Function
// This function processes payments and updates payment status

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

// Use any type instead of importing Database type that doesn't exist
type Database = any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProcessPaymentRequest {
  userId: string;
  bookingId: string; // TEXT type in database
  amount: number;
  paymentMethod: string; // "Cash", "Bank Transfer", "Credit/Debit Card"
  bankName?: string;
  isPartialPayment?: boolean;
  isGuestBooking?: boolean;
}

Deno.serve(async (req) => {
  console.log(
    "[ProcessPayment] Function invoked at:",
    new Date().toISOString(),
  );
  console.log("[ProcessPayment] Request method:", req.method);
  console.log(
    "[ProcessPayment] Request headers:",
    Object.fromEntries(req.headers.entries()),
  );

  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    console.log("[ProcessPayment] Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[ProcessPayment] Starting payment processing...");

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";

    console.log("[ProcessPayment] Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      supabaseUrlLength: supabaseUrl.length,
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[ProcessPayment] Missing environment variables");
      throw new Error("Missing environment variables for Supabase connection");
    }

    // Create Supabase client with admin privileges
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Parse request body
    console.log("[ProcessPayment] Parsing request body...");
    const requestBody = await req.json();
    console.log(
      "[ProcessPayment] Request body received:",
      JSON.stringify(requestBody, null, 2),
    );

    const {
      userId,
      bookingId,
      amount,
      paymentMethod,
      bankName,
      isPartialPayment,
      isGuestBooking,
    } = requestBody;

    // CRITICAL: Ensure bookingId is always treated as string
    const bookingIdString = String(bookingId);

    console.log("[ProcessPayment] Extracted parameters:", {
      userId: userId,
      userIdType: typeof userId,
      bookingId: bookingId,
      bookingIdString: bookingIdString,
      bookingIdType: typeof bookingId,
      bookingIdStringType: typeof bookingIdString,
      amount: amount,
      paymentMethod: paymentMethod,
      bankName: bankName,
      isPartialPayment: isPartialPayment,
      isGuestBooking: isGuestBooking,
    });

    // Check if this is a guest booking to bypass journal entries
    const isGuest = isGuestBooking === true;

    if (isGuest) {
      console.log("[Journal Skipped] Booking by guest, jurnal tidak disimpan.");
    }

    // Validate required fields - for guest bookings, userId might be null
    if (!bookingIdString || !amount || !paymentMethod) {
      throw new Error(
        "Missing required fields: bookingId, amount, and paymentMethod are required",
      );
    }

    // For guest bookings, allow null userId but validate other required fields
    if (!isGuest && !userId) {
      throw new Error(
        "Missing required field: userId is required for non-guest bookings",
      );
    }

    // Handle guest users with a special guest ID format
    let finalUserId = userId;
    if (!finalUserId || finalUserId === "guest-user" || isGuest) {
      finalUserId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    }

    // Check if booking exists - ensure bookingId is treated as text
    console.log("[ProcessPayment] Checking if booking exists...");
    console.log(
      "[ProcessPayment] Looking for booking with ID:",
      bookingIdString,
    );

    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select("id, total_amount, payment_status")
      .eq("id", bookingIdString)
      .single();

    console.log("[ProcessPayment] Booking query result:", {
      bookingData: bookingData,
      bookingError: bookingError,
    });

    if (bookingError || !bookingData) {
      throw new Error(`Booking with ID ${bookingIdString} not found`);
    }

    // Create payment record - ensure booking_id is text
    console.log("[ProcessPayment] Creating payment record...");
    const paymentInsertData = {
      user_id: finalUserId,
      booking_id: bookingIdString, // Use the string version
      amount: amount,
      payment_method: paymentMethod,
      status: "completed",
      created_at: new Date().toISOString(),
      bank_name: bankName || null,
      is_partial_payment: isPartialPayment || false,
    };

    console.log(
      "[ProcessPayment] Payment insert data:",
      JSON.stringify(paymentInsertData, null, 2),
    );

    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .insert(paymentInsertData)
      .select()
      .single();

    console.log("[ProcessPayment] Payment creation result:", {
      paymentData: paymentData,
      paymentError: paymentError,
    });

    if (paymentError) {
      throw new Error(
        `Failed to create payment record: ${paymentError.message}`,
      );
    }

    // Determine payment status for booking
    let paymentStatus = "partial";

    // Get total payments for this booking - ensure booking_id is text
    console.log(
      "[ProcessPayment] Fetching total payments for booking:",
      bookingIdString,
    );

    const { data: totalPaymentsData, error: totalPaymentsError } =
      await supabase
        .from("payments")
        .select("amount")
        .eq("booking_id", bookingIdString);

    console.log("[ProcessPayment] Total payments query result:", {
      totalPaymentsData: totalPaymentsData,
      totalPaymentsError: totalPaymentsError,
    });

    if (totalPaymentsError) {
      throw new Error(
        `Failed to fetch payment records: ${totalPaymentsError.message}`,
      );
    }

    // Calculate total paid amount
    const totalPaid = totalPaymentsData.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0,
    );

    // If total paid equals or exceeds total amount, mark as paid
    if (totalPaid >= (bookingData.total_amount || 0)) {
      paymentStatus = "paid";
    }

    // Update booking payment status - ensure id is text
    console.log(
      "[ProcessPayment] Updating booking payment status to:",
      paymentStatus,
    );
    console.log("[ProcessPayment] Updating booking with ID:", bookingIdString);

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({ payment_status: paymentStatus })
      .eq("id", bookingIdString)
      .select();

    console.log("[ProcessPayment] Booking update result:", {
      updatedBooking: updatedBooking,
      updateError: updateError,
    });

    if (updateError) {
      throw new Error(
        `Failed to update booking status: ${updateError.message}`,
      );
    }

    // Handle journal entries - BYPASS for guest bookings
    if (!isGuest) {
      console.log(
        "[ProcessPayment] Processing journal entries for authenticated user",
      );

      // Check for null values before inserting journal entries
      if (!finalUserId || !bookingIdString) {
        console.warn(
          "[ProcessPayment] Missing required data for journal entries, skipping",
        );
      } else {
        try {
          // Insert journal entries here (placeholder for actual journal logic)
          console.log(
            "[ProcessPayment] Journal entries would be inserted here for non-guest booking",
          );

          // Example journal entry logic (commented out as tables may not exist):
          /*
          const { error: journalError } = await supabase
            .from("journal_entries")
            .insert({
              booking_id: bookingIdString,
              user_id: finalUserId,
              amount: amount,
              type: "payment",
              created_at: new Date().toISOString(),
            });

          if (journalError) {
            console.error("[ProcessPayment] Error creating journal entry:", journalError);
          }

          const { error: ledgerError } = await supabase
            .from("general_ledger")
            .insert({
              account_id: "some_account_id", // This would need to be provided
              booking_id: bookingIdString,
              user_id: finalUserId,
              amount: amount,
              type: "credit",
              created_at: new Date().toISOString(),
            });

          if (ledgerError) {
            console.error("[ProcessPayment] Error creating ledger entry:", ledgerError);
          }
          */
        } catch (journalErr) {
          console.error(
            "[ProcessPayment] Error processing journal entries:",
            journalErr,
          );
          // Don't fail the payment if journal entries fail
        }
      }
    } else {
      console.log(
        "[Journal Skipped] Guest booking detected, skipping journal entries",
      );
    }

    const successResponse = {
      success: true,
      message: "Payment processed successfully",
      data: {
        payment: paymentData,
        booking: updatedBooking,
        totalPaid: totalPaid,
        isGuestBooking: isGuest,
      },
    };

    console.log(
      "[ProcessPayment] Success! Returning response:",
      JSON.stringify(successResponse, null, 2),
    );

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[ProcessPayment] Error occurred:", error);
    console.error("[ProcessPayment] Error message:", error.message);
    console.error("[ProcessPayment] Error stack:", error.stack);

    const errorResponse = {
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    console.log(
      "[ProcessPayment] Returning error response:",
      JSON.stringify(errorResponse, null, 2),
    );

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
