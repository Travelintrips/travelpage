import { supabase } from "./supabase";

interface PaymentRequest {
  userId: string;
  bookingId: string; // Text-based booking IDs
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
            booking_id: paymentData.bookingId, // Already a string
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

      // For guest users, set user_id to null since they don't have a UUID
      let userId = paymentData.userId;
      if (userId === "guest-user" || !userId) {
        userId = null;
      } else {
        // Ensure userId is converted to string for TEXT column
        userId = userId.toString();
      }

      // Direct database operation fallback
      // 1. Create payment record
      const { data: paymentRecord, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: userId, // TEXT or null for guest users
          booking_id: paymentData.bookingId, // Already a string
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

      // After successful payment creation, check if we need to create airport transfer bookings
      await createAirportTransferBookingsFromCart(paymentRecord.id);

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

// Function to create airport transfer bookings from cart items after successful payment
async function createAirportTransferBookingsFromCart(paymentId: string) {
  try {
    console.log(
      "[Payment Service] Checking for airport transfer items in cart for payment:",
      paymentId,
    );

    // Get the payment details to find the user
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("user_id")
      .eq("id", paymentId)
      .single();

    if (paymentError || !paymentData) {
      console.error("[Payment Service] Could not find payment:", paymentError);
      return;
    }

    // Get cart items for this user that are airport transfers
    const { data: cartItems, error: cartError } = await supabase
      .from("shopping_cart")
      .select("*")
      .eq("user_id", paymentData.user_id)
      .eq("item_type", "airport_transfer");

    if (cartError) {
      console.error("[Payment Service] Error fetching cart items:", cartError);
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      console.log("[Payment Service] No airport transfer items found in cart");
      return;
    }

    console.log(
      `[Payment Service] Found ${cartItems.length} airport transfer items in cart`,
    );

    // Process each airport transfer item
    for (const cartItem of cartItems) {
      try {
        let details = cartItem.details;

        // Parse details if it's a string
        if (typeof details === "string") {
          details = JSON.parse(details);
        }

        // Call the edge function to create the airport transfer booking
        const { data: bookingResult, error: bookingError } =
          await supabase.functions.invoke(
            "supabase-functions-create-airport-transfer-booking",
            {
              body: {
                paymentId: paymentId,
                cartItemDetails: details,
              },
            },
          );

        if (bookingError) {
          console.error(
            "[Payment Service] Error creating airport transfer booking:",
            bookingError,
          );
        } else {
          console.log(
            "[Payment Service] Airport transfer booking created successfully:",
            bookingResult,
          );
        }
      } catch (itemError) {
        console.error(
          "[Payment Service] Error processing cart item:",
          itemError,
        );
      }
    }
  } catch (error) {
    console.error(
      "[Payment Service] Error in createAirportTransferBookingsFromCart:",
      error,
    );
  }
}

// Function to validate UUID format
function isValidUUID(uuid: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    uuid,
  );
}

export async function getPaymentsByBookingId(bookingId: string) {
  // Handle text-based booking IDs
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId);

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
  bookingId: string; // Text-based booking IDs
  amount: number;
  paymentMethod: string;
  status?: string;
  transactionId?: string;
  bankName?: string;
  isPartialPayment?: boolean;
}) {
  try {
    // For guest users, set user_id to null since they don't have a UUID
    let userId = paymentData.userId;
    if (userId === "guest-user" || !userId) {
      userId = null;
    } else {
      // Ensure userId is converted to string for TEXT column
      userId = userId.toString();
    }

    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId, // TEXT or null for guest users
        booking_id: paymentData.bookingId, // Text-based booking IDs
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
