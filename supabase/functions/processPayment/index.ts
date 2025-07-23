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
  bookingId: number;
  amount: number;
  paymentMethod: string; // "Cash", "Bank Transfer", "Credit/Debit Card"
  bankName?: string;
  isPartialPayment?: boolean;
  isGuestBooking?: boolean;
}

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
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
    const {
      userId,
      bookingId,
      amount,
      paymentMethod,
      bankName,
      isPartialPayment,
      isGuestBooking,
    } = await req.json();

    // Check if this is a guest booking to bypass journal entries
    const isGuest = isGuestBooking === true;

    if (isGuest) {
      console.log("[Journal Skipped] Booking by guest, jurnal tidak disimpan.");
    }

    // Validate required fields - for guest bookings, userId might be null
    if (!bookingId || !amount || !paymentMethod) {
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

    // Check if booking exists
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select("id, total_amount, payment_status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !bookingData) {
      throw new Error(`Booking with ID ${bookingId} not found`);
    }

    // Create payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: finalUserId,
        booking_id: bookingId,
        amount: amount,
        payment_method: paymentMethod,
        status: "completed",
        created_at: new Date().toISOString(),
        bank_name: bankName || null,
        is_partial_payment: isPartialPayment || false,
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(
        `Failed to create payment record: ${paymentError.message}`,
      );
    }

    // Determine payment status for booking
    let paymentStatus = "partial";

    // Get total payments for this booking
    const { data: totalPaymentsData, error: totalPaymentsError } =
      await supabase
        .from("payments")
        .select("amount")
        .eq("booking_id", bookingId);

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

    // Update booking payment status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({ payment_status: paymentStatus })
      .eq("id", bookingId)
      .select();

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
      if (!finalUserId || !bookingId) {
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
              booking_id: bookingId,
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
              booking_id: bookingId,
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment processed successfully",
        data: {
          payment: paymentData,
          booking: updatedBooking,
          totalPaid: totalPaid,
          isGuestBooking: isGuest,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("[ProcessPayment] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
