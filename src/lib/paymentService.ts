import { supabase } from "./supabase";

interface PaymentRequest {
  userId: string;
  bookingId: string | number;
  amount: number;
  paymentMethod: string; // "cash", "bank", "card"
  transactionId?: string;
  bankName?: string;
  isPartialPayment?: boolean;
  isDamagePayment?: boolean;
  damageIds?: string[];
}

export async function processPayment(paymentData: PaymentRequest) {
  try {
    // Check if this is a guest booking to bypass journal entries
    let isGuestBooking = false;

    // Check booking tables for is_guest flag
    const bookingTables = ["bookings", "baggage_booking", "airport_transfer"];

    for (const table of bookingTables) {
      try {
        const { data: bookingData, error } = await supabase
          .from(table)
          .select("is_guest")
          .eq("id", paymentData.bookingId)
          .maybeSingle();

        if (!error && bookingData) {
          isGuestBooking = bookingData.is_guest === true;
          console.log(
            `[Payment Service] Found booking in ${table}, is_guest: ${isGuestBooking}`,
          );
          break;
        }
      } catch (err) {
        console.warn(
          `[Payment Service] Could not check ${table} for booking ${paymentData.bookingId}:`,
          err,
        );
      }
    }

    if (isGuestBooking) {
      console.log("[Journal Skipped] Booking by guest, jurnal tidak disimpan.");
    }

    // First try to use the edge function
    try {
      // Check if this payment is for damage fees
      if (
        paymentData.isDamagePayment &&
        paymentData.damageIds &&
        paymentData.damageIds.length > 0
      ) {
        // Create a payment record first
        const { data: paymentRecord, error: paymentError } = await supabase
          .from("payments")
          .insert({
            user_id: paymentData.userId,
            booking_id: paymentData.bookingId.toString(),
            amount: paymentData.amount,
            payment_method: paymentData.paymentMethod,
            status: "completed",
            transaction_id: paymentData.transactionId || null,
            bank_name: paymentData.bankName || null,
            is_partial_payment: paymentData.isPartialPayment || false,
            // Remove is_damage_payment as it doesn't exist in the schema

            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Update the damage records to mark them as paid
        const { error: damageUpdateError } = await supabase
          .from("damages")
          .update({
            payment_status: "paid",
            payment_id: paymentRecord.id,
          })
          .in("id", paymentData.damageIds);

        if (damageUpdateError) throw damageUpdateError;

        return { success: true, data: { payment: paymentRecord } };
      }

      // Use supabase client to invoke the function for regular payments
      const { data: functionData, error: functionError } =
        await supabase.functions.invoke("supabase-functions-processPayment", {
          body: {
            ...paymentData,
            isGuestBooking, // Pass guest flag to edge function
          },
        });

      if (functionError) {
        // Check if the error is related to journal entries
        const errorMessage = functionError.message || "";
        if (
          errorMessage.includes("Journal entry") ||
          errorMessage.includes("not found")
        ) {
          console.warn(
            "Journal entry error detected, falling back to direct database operation",
          );
          throw new Error("Journal entry error - falling back");
        }
        throw new Error(`Function error: ${functionError.message}`);
      }

      // Check if the response indicates success
      if (!functionData || functionData.success === false) {
        const errorMessage =
          functionData?.message || "Unknown error from edge function";
        // Check if the error is related to journal entries
        if (
          errorMessage.includes("Journal entry") ||
          errorMessage.includes("not found")
        ) {
          console.warn(
            "Journal entry error in response, falling back to direct database operation",
          );
          throw new Error("Journal entry error - falling back");
        }
        throw new Error(errorMessage);
      }

      // If we got here, the function call was successful
      return { success: true, data: functionData };
    } catch (edgeFunctionError) {
      console.warn(
        "Edge function error, falling back to direct database operation",
        edgeFunctionError,
      );

      // Log more detailed error information
      console.error(
        "Edge function detailed error:",
        JSON.stringify(edgeFunctionError),
      );

      // Handle guest users with a special guest ID format
      let userId = paymentData.userId;
      if (userId === "guest-user") {
        userId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      }

      // Direct database operation fallback
      // 1. Create payment record
      const { data: paymentRecord, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: userId,
          booking_id: paymentData.bookingId.toString(), // Ensure bookingId is a string
          amount: paymentData.amount,
          payment_method: paymentData.paymentMethod,
          status: "completed",
          transaction_id: paymentData.transactionId || null,
          bank_name: paymentData.bankName || null,
          is_partial_payment: paymentData.isPartialPayment || false,

          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Get booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("total_amount, payment_status")
        .eq("id", paymentData.bookingId)
        .single();

      if (bookingError) throw bookingError;

      // 3. Calculate total paid amount
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("booking_id", paymentData.bookingId);

      if (paymentsError) throw paymentsError;

      const totalPaid = paymentsData.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      );

      // 4. Determine payment status
      let paymentStatus = "partial";
      if (totalPaid >= bookingData.total_amount) {
        paymentStatus = "paid";
      }

      // 5. Update booking payment status
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ payment_status: paymentStatus })
        .eq("id", paymentData.bookingId);

      if (updateError) throw updateError;

      // 6. If this is a damage payment, update the damage records
      if (
        paymentData.isDamagePayment &&
        paymentData.damageIds &&
        paymentData.damageIds.length > 0
      ) {
        const { error: damageUpdateError } = await supabase
          .from("damages")
          .update({
            payment_status: "paid",
            payment_id: paymentRecord.id,
          })
          .in("id", paymentData.damageIds);

        if (damageUpdateError) {
          console.error("Error updating damage records:", damageUpdateError);
          // Continue execution even if damage update fails
        }
      }

      return {
        success: true,
        data: {
          payment: paymentRecord,
          paymentStatus,
        },
      };
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    return { success: false, error };
  }
}

// Function to validate UUID format
function isValidUUID(uuid: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    uuid,
  );
}

export async function getPaymentsByBookingId(bookingId: string | number) {
  // Handle both UUID and numeric booking IDs
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId.toString());

  if (error) {
    console.error("Error fetching payments:", error);
    return { success: false, error };
  }

  return { success: true, data };
}

export async function getPaymentsByUserId(userId: string) {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*, bookings(*)")
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching user payments:", error);
    return { success: false, error };
  }
}

export async function createPayment(paymentData: {
  userId: string;
  bookingId: number;
  amount: number;
  paymentMethod: string;
  status?: string;
  transactionId?: string;
  bankName?: string;
  isPartialPayment?: boolean;
}) {
  try {
    // Handle guest users with a special guest ID format
    let userId = paymentData.userId;
    if (userId === "guest-user") {
      userId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    }

    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        booking_id: paymentData.bookingId.toString(), // Ensure bookingId is a string
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        status: paymentData.status || "completed",
        transaction_id: paymentData.transactionId || null,
        bank_name: paymentData.bankName || null,
        is_partial_payment: paymentData.isPartialPayment || false,

        created_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating payment:", error);
    return { success: false, error };
  }
}
