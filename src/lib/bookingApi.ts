import { supabase } from "./supabase";
import type { Database } from "@/types/supabase";

type AirportTransfer = Database["public"]["Tables"]["airport_transfer"]["Row"];
type AirportTransferInsert =
  Database["public"]["Tables"]["airport_transfer"]["Insert"];
type AirportTransferUpdate =
  Database["public"]["Tables"]["airport_transfer"]["Update"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

/**
 * Send booking to external API
 */
export async function sendNewBooking(bookingData: any) {
  try {
    const response = await fetch(
      "https://appserverv2.travelincars.com/api/new-booking.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup_datetime: bookingData.pickup_datetime,
          pickup_address: bookingData.pickup_address,
          pickup_long: bookingData.pickup_long,
          pickup_lat: bookingData.pickup_lat,
          dropoff_address: bookingData.dropoff_address,
          dropoff_long: bookingData.dropoff_long,
          dropoff_lat: bookingData.dropoff_lat,
          estimated_cost: String(bookingData.estimated_cost),
          ride_id: String(bookingData.ride_id),
          customer_name: bookingData.customer_name,
          customer_phone: bookingData.customer_phone,
          driver_id: String(bookingData.driver_id),
        }),
      },
    );

    const text = await response.text(); // ⬅️ baca sebagai teks dulu

    if (!response.ok) {
      console.error("❌ External API returned error:", response.status, text);
      return { data: null, error: `HTTP ${response.status}: ${text}` };
    }

    try {
      const json = JSON.parse(text);
      return { data: json, error: null };
    } catch (parseError) {
      console.warn("⚠️ Response not valid JSON:", text);
      return { data: text, error: "Invalid JSON response" };
    }
  } catch (error) {
    console.error("❌ Network/Fetch error:", error);
    return { data: null, error };
  }
}

/**
 * Create a new booking
 */
export async function createBooking(bookingData: AirportTransferInsert) {
  // Step 1: Insert booking to Supabase
  const { data, error } = await supabase
    .from("airport_transfer")
    .insert(bookingData)
    .select()
    .single();

  if (error) {
    console.error("❌ Error creating booking:", error.message);
    return { error };
  }

  const inserted = data;
  if (!inserted) {
    console.warn("⚠️ Booking inserted but no data returned");
    return { error: "Booking inserted, but no data returned" };
  }

  // Step 2: Send to external API
  try {
    const externalData = {
      pickup_datetime: `${inserted.pickup_date || new Date().toISOString().split("T")[0]} ${inserted.pickup_time || "10:00"}`,
      pickup_address: inserted.pickup_location || "",
      pickup_long: String((inserted.fromLocation as any)?.[1] || "106.6571842"),
      pickup_lat: String((inserted.fromLocation as any)?.[0] || "-6.1286371"),
      dropoff_address: inserted.dropoff_location || "",
      dropoff_long: String((inserted.toLocation as any)?.[1] || "106.6571842"),
      dropoff_lat: String((inserted.toLocation as any)?.[0] || "-6.1286371"),
      estimated_cost: String(inserted.price || "100000"),
      ride_id: 1,
      customer_name: inserted.customer_name || "",
      customer_phone: inserted.phone || "",
      driver_id: String(inserted.driver_id || "0"),
    };

    const { data: apiResponse, error: apiError } =
      await sendNewBooking(externalData);

    if (apiError) {
      console.error("❌ Failed to send to external API:", apiError);
      return { data: inserted, apiError };
    }

    console.log("✅ Booking sent to external API:", apiResponse);
    return { data: inserted };
  } catch (err) {
    console.error("❌ Exception during API call:", err);
    return { data: inserted, error: err };
  }
}

/**
 * Get bookings with optional filters
 */
export async function getBookings(params?: {
  id?: number;
  vehicle_id?: number;
  status?: string;
}) {
  const queryParams = new URLSearchParams();

  if (params?.id) queryParams.append("id", params.id.toString());
  if (params?.vehicle_id)
    queryParams.append("vehicle_id", params.vehicle_id.toString());
  if (params?.status) queryParams.append("status", params.status);

  return await supabase.functions.invoke("supabase-functions-get-booking", {
    queryParams,
  });
}

/**
 * Get a single booking by ID
 */
export async function getBookingById(id: number) {
  return await getBookings({ id });
}

/**
 * Update an existing booking
 */
export async function updateBooking(id: number, updateData: BookingUpdate) {
  return await supabase.functions.invoke("supabase-functions-update-booking", {
    body: { id, ...updateData },
  });
}

/**
 * Delete a booking
 */
export async function deleteBooking(id: number) {
  const queryParams = new URLSearchParams();
  queryParams.append("id", id.toString());

  return await supabase.functions.invoke("supabase-functions-delete-booking", {
    queryParams,
  });
}
