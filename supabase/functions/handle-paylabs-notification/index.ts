import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaylabsWebhookPayload {
  transaction_id: string;
  payment_id?: string;
  status: string;
  amount: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  payment_method: string;
  va_number?: string;
  payment_url?: string;
  created_at: string;
  updated_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload
    const payload: PaylabsWebhookPayload = await req.json();
    console.log("Received Paylabs webhook:", payload);

    // Validate required fields
    if (!payload.transaction_id || !payload.status) {
      console.error("Missing required fields in webhook payload");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Map Paylabs status to our internal status
    const mapPaylabsStatus = (paylabsStatus: string): string => {
      switch (paylabsStatus.toLowerCase()) {
        case "paid":
        case "success":
        case "completed":
          return "paid";
        case "pending":
        case "waiting":
          return "pending";
        case "expired":
        case "cancelled":
        case "failed":
          return "failed";
        default:
          return "pending";
      }
    };

    const internalStatus = mapPaylabsStatus(payload.status);

    // Find the payment record using paylabs_transaction_id or payment_id
    let paymentRecords;
    let findError;

    // Try to find by paylabs_transaction_id first
    const { data: paymentsByTransactionId, error: transactionIdError } =
      await supabase
        .from("payments")
        .select("*")
        .eq("paylabs_transaction_id", payload.transaction_id);

    if (
      !transactionIdError &&
      paymentsByTransactionId &&
      paymentsByTransactionId.length > 0
    ) {
      paymentRecords = paymentsByTransactionId;
    } else if (payload.payment_id) {
      // Try to find by payment_id if transaction_id didn't work
      const { data: paymentsByPaymentId, error: paymentIdError } =
        await supabase
          .from("payments")
          .select("*")
          .eq("paylabs_transaction_id", payload.payment_id);

      paymentRecords = paymentsByPaymentId;
      findError = paymentIdError;
    } else {
      findError = transactionIdError;
    }

    if (findError) {
      console.error("Error finding payment record:", findError);
      return new Response(
        JSON.stringify({ error: "Database error while finding payment" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!paymentRecords || paymentRecords.length === 0) {
      console.error(
        "Payment record not found for transaction_id:",
        payload.transaction_id,
      );
      return new Response(
        JSON.stringify({ error: "Payment record not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const paymentRecord = paymentRecords[0];
    console.log("Found payment record:", paymentRecord.id);

    // Update the payment status and additional fields
    const updateData: any = {
      status: internalStatus,
      updated_at: new Date().toISOString(),
    };

    // Update VA number and payment URL if provided
    if (payload.va_number) {
      updateData.va_number = payload.va_number;
    }
    if (payload.payment_url) {
      updateData.payment_url = payload.payment_url;
    }

    const { error: updateError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", paymentRecord.id);

    if (updateError) {
      console.error("Error updating payment record:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update payment status" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Payment ${paymentRecord.id} status updated to: ${internalStatus}`,
    );

    // If payment is successful, update related booking statuses
    if (internalStatus === "paid") {
      try {
        // Get payment bookings to update related bookings
        const { data: paymentBookings } = await supabase
          .from("payment_bookings")
          .select("booking_id, booking_type")
          .eq("payment_id", paymentRecord.id);

        if (paymentBookings && paymentBookings.length > 0) {
          for (const booking of paymentBookings) {
            // Update booking status based on booking type
            let tableName = "";
            switch (booking.booking_type) {
              case "baggage":
                tableName = "baggage_booking";
                break;
              case "airport_transfer":
                tableName = "airport_transfer";
                break;
              case "handling":
                tableName = "handling_bookings";
                break;
              case "car":
              case "car_rental":
                tableName = "bookings";
                break;
            }

            if (tableName) {
              await supabase
                .from(tableName)
                .update({
                  status: "confirmed",
                  payment_status: "paid",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", booking.booking_id);
            }
          }
        }
      } catch (bookingUpdateError) {
        console.error("Error updating booking statuses:", bookingUpdateError);
        // Don't fail the webhook if booking update fails
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook processed successfully",
        payment_id: paymentRecord.id,
        status: internalStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
