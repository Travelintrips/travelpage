import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  ArrowLeft,
  Download,
  Plane,
  StickyNote,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Luggage,
  Car,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

interface PaymentDetails {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  user_id?: string;
  va_number?: string;
  payment_url?: string;
  paylabs_transaction_id?: string;
}

interface BookingDetails {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  item_name?: string;
  flight_number?: string;
  baggage_size?: string;
  price: number;
  duration?: string;
  storage_location?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  airport?: string;
  terminal?: string;
  duration_type?: string;
  hours?: string;
  notes?: string;
  status: string;
  // Airport transfer specific fields
  pickup_location?: string;
  dropoff_location?: string;
  pickup_date?: string;
  pickup_time?: string;
  vehicle_name?: string;
  driver_name?: string;
  license_plate?: string;
  distance?: string;
  type?: string;
  // Car rental specific fields
  driver_option?: string;
  // Handling specific fields
  category?: string;
  pickup_area?: string;
  passenger_area?: string;
  travel_type?: string;
  passengers?: number;
  additional_notes?: string;
  booking_type?: "baggage" | "airport_transfer" | "car_rental" | "handling";
}

const ThankYouPage: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [bookings, setBookings] = useState<BookingDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentAndBookings = async () => {
      if (!paymentId) {
        setError("Payment ID not found");
        setLoading(false);
        return;
      }

      try {
        // Fetch payment details
        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .select("*")
          .eq("id", paymentId)
          .single();

        if (paymentError) {
          console.error("Error fetching payment:", paymentError);
          setError("Failed to load payment details");
          return;
        }

        setPayment(paymentData);
        console.log("Payment data:", paymentData);

        // Combine all bookings using the new payment_bookings table
        const allBookings: BookingDetails[] = [];

        // 1. First, get all booking IDs and types from payment_bookings table
        console.log("Fetching payment bookings for payment ID:", paymentId);

        const { data: paymentBookings, error: paymentBookingsError } =
          await supabase
            .from("payment_bookings")
            .select("booking_id, booking_type")
            .eq("payment_id", paymentId);

        console.log("Payment bookings found:", paymentBookings);
        console.log("Payment bookings error:", paymentBookingsError);

        if (paymentBookingsError) {
          console.error(
            "Error fetching payment bookings:",
            paymentBookingsError,
          );
        } else if (paymentBookings && paymentBookings.length > 0) {
          // 2. Fetch details for each booking based on its type
          for (const paymentBooking of paymentBookings) {
            const { booking_id, booking_type } = paymentBooking;

            try {
              if (booking_type === "baggage") {
                console.log("Fetching baggage booking:", booking_id);

                const { data: baggageBooking, error: baggageError } =
                  await supabase
                    .from("baggage_booking")
                    .select("*")
                    .eq("id", booking_id)
                    .single();

                if (!baggageError && baggageBooking) {
                  allBookings.push({
                    ...baggageBooking,
                    booking_id: baggageBooking.booking_id || baggageBooking.id,
                    booking_type: "baggage" as const,
                  });
                } else {
                  console.error(
                    "Error fetching baggage booking:",
                    baggageError,
                  );
                }
              } else if (booking_type === "airport_transfer") {
                console.log("Fetching airport transfer booking:", booking_id);

                const { data: transferBooking, error: transferError } =
                  await supabase
                    .from("airport_transfer")
                    .select("*")
                    .eq("id", booking_id)
                    .single();

                if (!transferError && transferBooking) {
                  allBookings.push({
                    booking_id:
                      transferBooking.code_booking || transferBooking.id,
                    customer_name: transferBooking.customer_name || "Guest",
                    customer_email: "",
                    customer_phone: transferBooking.phone || "",
                    item_name: "Airport Transfer Service",
                    price: transferBooking.price || 0,
                    pickup_location: transferBooking.pickup_location,
                    dropoff_location: transferBooking.dropoff_location,
                    pickup_date: transferBooking.pickup_date,
                    pickup_time: transferBooking.pickup_time,
                    vehicle_name: transferBooking.vehicle_name,
                    driver_name: transferBooking.driver_name,
                    license_plate: transferBooking.license_plate,
                    distance: transferBooking.distance,
                    type: transferBooking.type,
                    status: transferBooking.status || "confirmed",
                    booking_type: "airport_transfer" as const,
                  });
                } else {
                  console.error(
                    "Error fetching airport transfer booking:",
                    transferError,
                  );
                }
              } else if (booking_type === "handling") {
                console.log("Fetching handling booking:", booking_id);

                const { data: handlingBooking, error: handlingError } =
                  await supabase
                    .from("handling_bookings")
                    .select("*")
                    .eq("id", booking_id)
                    .single();

                if (!handlingError && handlingBooking) {
                  allBookings.push({
                    booking_id: handlingBooking.booking_id,
                    customer_name: handlingBooking.customer_name || "Guest",
                    customer_email: handlingBooking.customer_email || "",
                    customer_phone: handlingBooking.customer_phone || "",
                    item_name: `Handling Service - ${handlingBooking.pickup_area} - ${handlingBooking.passenger_area}`,
                    price: handlingBooking.total_price || 0,
                    category: handlingBooking.category,
                    pickup_area: handlingBooking.pickup_area,
                    passenger_area: handlingBooking.passenger_area,
                    travel_type: handlingBooking.travel_type,
                    passengers: handlingBooking.passengers,
                    pickup_date: handlingBooking.pickup_date,
                    pickup_time: handlingBooking.pickup_time,
                    flight_number: handlingBooking.flight_number,
                    additional_notes: handlingBooking.additional_notes,
                    status: handlingBooking.status || "confirmed",
                    booking_type: "handling" as const,
                  });
                } else {
                  console.error(
                    "Error fetching handling booking:",
                    handlingError,
                  );
                }
              } else if (
                booking_type === "car" ||
                booking_type === "car_rental"
              ) {
                console.log("Fetching car rental booking:", booking_id);

                const { data: carBooking, error: carError } = await supabase
                  .from("bookings")
                  .select(
                    `
                    id,
                    total_amount,
                    start_date,
                    end_date,
                    pickup_time,
                    driver_option,
                    status,
                    vehicles!bookings_vehicle_id_fkey (
                      make,
                      model,
                      year,
                      license_plate
                    )
                  `,
                  )
                  .eq("id", booking_id)
                  .single();

                if (!carError && carBooking) {
                  const vehicle = carBooking.vehicles as any;
                  allBookings.push({
                    booking_id: carBooking.id.toString(),
                    customer_name: paymentData.user_id ? "Customer" : "Guest",
                    customer_email: "",
                    customer_phone: "",
                    item_name: `${vehicle?.make || "Unknown"} ${vehicle?.model || "Vehicle"} ${vehicle?.year ? `(${vehicle.year})` : ""}`,
                    price: carBooking.total_amount,
                    start_date: carBooking.start_date,
                    end_date: carBooking.end_date,
                    start_time: carBooking.pickup_time,
                    driver_option: carBooking.driver_option,
                    license_plate: vehicle?.license_plate,
                    status: carBooking.status || "confirmed",
                    booking_type: "car_rental" as const,
                  });
                } else {
                  console.error("Error fetching car rental booking:", carError);
                }
              }
            } catch (error) {
              console.error(
                `Error processing ${booking_type} booking ${booking_id}:`,
                error,
              );
            }
          }
        }

        // Fallback: If no bookings found through payment_bookings, try the old method
        if (allBookings.length === 0) {
          console.log(
            "No bookings found through payment_bookings, trying fallback methods...",
          );

          // 1. Fetch baggage bookings using booking_id from payments table
          if (paymentData.booking_id) {
            console.log(
              "Searching for baggage bookings with booking_id:",
              paymentData.booking_id,
            );

            const { data: baggageBookings, error: baggageError } =
              await supabase
                .from("baggage_booking")
                .select("*")
                .eq("booking_id", paymentData.booking_id);

            console.log("Baggage bookings found:", baggageBookings);

            if (
              !baggageError &&
              baggageBookings &&
              baggageBookings.length > 0
            ) {
              allBookings.push(
                ...baggageBookings.map((booking) => ({
                  ...booking,
                  booking_id: booking.booking_id || booking.id,
                  booking_type: "baggage" as const,
                })),
              );
            }
          }

          // 2. Fetch airport transfer bookings by matching payment amount and recent time
          console.log(
            "Searching for airport transfers with payment amount:",
            paymentData.amount,
          );

          const { data: airportTransfersByAmount, error: airportAmountError } =
            await supabase
              .from("airport_transfer")
              .select("*")
              .eq("price", paymentData.amount)
              .gte(
                "created_at",
                new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              )
              .order("created_at", { ascending: false })
              .limit(1); // Only get the most recent one to avoid duplicates

          console.log(
            "Airport transfers by amount found:",
            airportTransfersByAmount,
          );

          if (
            !airportAmountError &&
            airportTransfersByAmount &&
            airportTransfersByAmount.length > 0
          ) {
            allBookings.push(
              ...airportTransfersByAmount.map((transfer) => ({
                booking_id: transfer.code_booking || transfer.id.toString(),
                customer_name: transfer.customer_name || "Guest",
                customer_email: "",
                customer_phone: transfer.phone || "",
                item_name: "Airport Transfer Service",
                price: transfer.price || 0,
                pickup_location: transfer.pickup_location,
                dropoff_location: transfer.dropoff_location,
                pickup_date: transfer.pickup_date,
                pickup_time: transfer.pickup_time,
                vehicle_name: transfer.vehicle_name,
                driver_name: transfer.driver_name,
                license_plate: transfer.license_plate,
                distance: transfer.distance,
                type: transfer.type,
                status: transfer.status || "pending",
                booking_type: "airport_transfer" as const,
              })),
            );
          }

          // 3. Fetch car rental bookings
          if (paymentData.booking_id) {
            const { data: carBookings, error: carError } = await supabase
              .from("bookings")
              .select(
                `
                id,
                total_amount,
                start_date,
                end_date,
                pickup_time,
                driver_option,
                status,
                vehicles!bookings_vehicle_id_fkey (
                  make,
                  model,
                  year
                )
              `,
              )
              .eq("id", paymentData.booking_id);

            console.log("Car bookings found:", carBookings);

            if (!carError && carBookings && carBookings.length > 0) {
              allBookings.push(
                ...carBookings.map((booking) => {
                  const vehicle = booking.vehicles as any;
                  return {
                    booking_id: booking.id.toString(),
                    customer_name: paymentData.user_id ? "Customer" : "Guest",
                    customer_email: "",
                    customer_phone: "",
                    item_name: `${vehicle?.make || "Unknown"} ${vehicle?.model || "Vehicle"} ${vehicle?.year ? `(${vehicle.year})` : ""}`,
                    price: booking.total_amount,
                    start_date: booking.start_date,
                    end_date: booking.end_date,
                    start_time: booking.pickup_time,
                    status: booking.status,
                    booking_type: "car_rental" as const,
                  };
                }),
              );
            }
          }
        }

        // 4. If still no bookings found through direct relationships, try alternative approaches
        if (allBookings.length === 0) {
          console.log(
            "No bookings found through direct relationships, trying alternative approaches...",
          );

          // Try to find baggage bookings by customer and recent time
          if (paymentData.user_id) {
            const { data: baggageByCustomer, error: baggageCustomerError } =
              await supabase
                .from("baggage_booking")
                .select("*")
                .eq("customer_id", paymentData.user_id)
                .gte(
                  "created_at",
                  new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                ); // Last 2 hours

            if (
              !baggageCustomerError &&
              baggageByCustomer &&
              baggageByCustomer.length > 0
            ) {
              console.log(
                "Found baggage bookings by customer:",
                baggageByCustomer,
              );
              allBookings.push(
                ...baggageByCustomer.map((booking) => ({
                  ...booking,
                  booking_id: booking.booking_id || booking.id,
                  booking_type: "baggage" as const,
                })),
              );
            }
          }

          // Try to find airport transfers by amount and recent time (if not already found)
          if (
            !allBookings.some(
              (booking) => booking.booking_type === "airport_transfer",
            )
          ) {
            const { data: airportByAmount, error: airportAmountError } =
              await supabase
                .from("airport_transfer")
                .select("*")
                .eq("price", paymentData.amount)
                .gte(
                  "created_at",
                  new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                )
                .order("created_at", { ascending: false })
                .limit(1); // Only get the most recent one to avoid duplicates

            if (
              !airportAmountError &&
              airportByAmount &&
              airportByAmount.length > 0
            ) {
              console.log(
                "Found airport transfers by amount:",
                airportByAmount,
              );
              allBookings.push(
                ...airportByAmount.map((transfer) => ({
                  booking_id: transfer.code_booking || transfer.id.toString(),
                  customer_name: transfer.customer_name || "Guest",
                  customer_email: "",
                  customer_phone: transfer.phone || "",
                  item_name: "Airport Transfer Service",
                  price: transfer.price || 0,
                  pickup_location: transfer.pickup_location,
                  dropoff_location: transfer.dropoff_location,
                  pickup_date: transfer.pickup_date,
                  pickup_time: transfer.pickup_time,
                  vehicle_name: transfer.vehicle_name,
                  driver_name: transfer.driver_name,
                  license_plate: transfer.license_plate,
                  distance: transfer.distance,
                  type: transfer.type,
                  status: transfer.status || "pending",
                  booking_type: "airport_transfer" as const,
                })),
              );
            }
          }
        }

        // Remove duplicates based on booking_id and booking_type
        const uniqueBookings = allBookings.filter((booking, index, self) => {
          return (
            index ===
            self.findIndex(
              (b) =>
                b.booking_id === booking.booking_id &&
                b.booking_type === booking.booking_type,
            )
          );
        });

        console.log(
          "Final combined bookings (before deduplication):",
          allBookings,
        );
        console.log(
          "Final unique bookings (after deduplication):",
          uniqueBookings,
        );
        setBookings(uniqueBookings);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentAndBookings();
  }, [paymentId]);

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "credit_card":
        return "Credit Card";
      case "bank_transfer":
        return "Bank Transfer";
      case "cash":
        return "Cash";
      case "paylabs":
        return "Paylabs";
      default:
        return method;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "Unable to load order details"}
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-green-600 hover:bg-green-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-lg text-gray-600">
              Thank you for your order. Your booking has been confirmed.
            </p>
          </div>

          {/* Payment Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Payment ID</p>
                  <p className="font-medium">{payment.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium">
                    {getPaymentMethodLabel(payment.payment_method)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-lg text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Date</p>
                  <p className="font-medium">
                    {new Date(payment.created_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Paylabs Payment Details */}
              {(payment.payment_method === "Paylabs" ||
                payment.va_number ||
                payment.payment_url ||
                payment.paylabs_transaction_id) && (
                <>
                  {payment.va_number && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">
                        Virtual Account Details
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-blue-700">
                            Virtual Account Number
                          </p>
                          <p className="font-mono text-lg font-bold text-blue-900 select-all">
                            {payment.va_number}
                          </p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-md">
                          <p className="text-xs text-blue-800 font-medium mb-1">
                            Payment Instructions:
                          </p>
                          <ul className="text-xs text-blue-700 space-y-1">
                            <li>
                              • Transfer exactly{" "}
                              {formatCurrency(payment.amount)} to the VA number
                              above
                            </li>
                            <li>• Payment will be processed automatically</li>
                            <li>• Keep your transfer receipt for reference</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {payment.payment_url && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">
                        Complete Your Payment
                      </h4>
                      <div className="space-y-2">
                        <a
                          href={payment.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                        >
                          Pay Now - {formatCurrency(payment.amount)}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <p className="text-xs text-green-600">
                          Click the button above to complete your payment
                          securely through Paylabs.
                        </p>
                      </div>
                    </div>
                  )}

                  {payment.paylabs_transaction_id && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        Paylabs Transaction ID
                      </p>
                      <p className="font-mono text-sm select-all">
                        {payment.paylabs_transaction_id}
                      </p>
                    </div>
                  )}

                  {(payment.va_number || payment.payment_url) && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Important:</strong> Your booking is confirmed
                        but payment is still pending. Please complete the
                        payment using the details above to avoid cancellation.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="mt-4">
                <Badge
                  variant={getStatusBadgeVariant(payment.status)}
                  className="text-sm"
                >
                  {payment.status.charAt(0).toUpperCase() +
                    payment.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          {bookings.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Luggage className="h-5 w-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {bookings.map((booking, index) => (
                    <div
                      key={booking.booking_id}
                      className="border-b border-gray-200 pb-6 last:border-b-0"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {booking.item_name || "Service Booking"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Booking ID: {booking.booking_id}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(booking.price)}
                          </p>
                          <Badge
                            variant={getStatusBadgeVariant(booking.status)}
                            className="text-xs"
                          >
                            {booking.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Customer Information */}
                      {booking.customer_name && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">Customer</p>
                              <p className="text-sm font-medium">
                                {booking.customer_name}
                              </p>
                            </div>
                          </div>
                          {booking.customer_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-600">Email</p>
                                <p className="text-sm font-medium">
                                  {booking.customer_email}
                                </p>
                              </div>
                            </div>
                          )}
                          {booking.customer_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-600">Phone</p>
                                <p className="text-sm font-medium">
                                  {booking.customer_phone}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Booking Specific Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Baggage Booking Details */}
                        {booking.booking_type === "baggage" && (
                          <>
                            {booking.baggage_size && (
                              <div className="flex items-center gap-2">
                                <Luggage className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Baggage Size
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.baggage_size
                                      .charAt(0)
                                      .toUpperCase() +
                                      booking.baggage_size.slice(1)}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.airport && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Airport
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.airport}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.terminal && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Terminal
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.terminal}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.storage_location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Storage Location
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.storage_location}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.flight_number &&
                              booking.flight_number !== "-" && (
                                <div className="flex items-center gap-2">
                                  <Plane className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <p className="text-xs text-gray-600">
                                      Flight Number
                                    </p>
                                    <p className="text-sm font-medium">
                                      {booking.flight_number}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {booking.notes &&
                              booking.notes !== "-" && (
                                <div className="flex items-center gap-2">
                                  <StickyNote className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <p className="text-xs text-gray-600">
                                      Notes
                                    </p>
                                    <p className="text-sm font-medium">
                                      {booking.notes}
                                    </p>
                                  </div>
                                </div>
                              )}
                          </>
                        )}

                        {/* Handling Service Details */}
                        {booking.booking_type === "handling" && (
                          <>
                            {booking.category && (
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Category
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.category}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.pickup_area && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Pickup Area
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.pickup_area}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.passenger_area && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Passenger Area
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.passenger_area}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.travel_type && (
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Travel Type
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.travel_type}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.passengers && (
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Passengers
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.passengers} person(s)
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.flight_number &&
                              booking.flight_number !== "-" && (
                                <div className="flex items-center gap-2">
                                  <Car className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <p className="text-xs text-gray-600">
                                      Flight Number
                                    </p>
                                    <p className="text-sm font-medium">
                                      {booking.flight_number}
                                    </p>
                                  </div>
                                </div>
                              )}
                            {booking.additional_notes && (
                              <div className="flex items-center gap-2 col-span-full">
                                <Car className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Additional Notes
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.additional_notes}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Airport Transfer Details */}
                        {booking.booking_type === "airport_transfer" && (
                          <>
                            {booking.pickup_location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Pickup Location
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.pickup_location}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.dropoff_location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Dropoff Location
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.dropoff_location}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.vehicle_name && (
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Vehicle
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.vehicle_name}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.driver_name && (
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Driver
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.driver_name}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.license_plate && (
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    License Plate
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.license_plate}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.distance && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Distance
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.distance}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Car Rental Details */}
                        {booking.booking_type === "car_rental" && (
                          <>
                            {booking.start_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Rental Start
                                  </p>
                                  <p className="text-sm font-medium">
                                    {new Date(
                                      booking.start_date,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.end_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Rental End
                                  </p>
                                  <p className="text-sm font-medium">
                                    {new Date(
                                      booking.end_date,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.start_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Pickup Time
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.start_time}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.driver_option && (
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    Driver Option
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.driver_option === "self"
                                      ? "Self-drive"
                                      : "With Driver"}
                                  </p>
                                </div>
                              </div>
                            )}
                            {booking.license_plate && (
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    License Plate
                                  </p>
                                  <p className="text-sm font-medium">
                                    {booking.license_plate}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Common Date/Time Fields - Only show if not already shown in booking type specific section */}
                        {(booking.start_date || booking.pickup_date) &&
                          booking.booking_type !== "airport_transfer" &&
                          booking.booking_type !== "car_rental" &&
                          booking.booking_type !== "handling" && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-600">
                                  Start Date
                                </p>
                                <p className="text-sm font-medium">
                                  {new Date(
                                    booking.start_date ||
                                      booking.pickup_date ||
                                      "",
                                  ).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                          )}
                        {(booking.start_time || booking.pickup_time) &&
                          booking.booking_type !== "airport_transfer" &&
                          booking.booking_type !== "car_rental" &&
                          booking.booking_type !== "handling" && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-600">
                                  Start Time
                                </p>
                                <p className="text-sm font-medium">
                                  {booking.start_time || booking.pickup_time}
                                </p>
                              </div>
                            </div>
                          )}
                        {booking.duration && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">Duration</p>
                              <p className="text-sm font-medium">
                                {booking.duration}{" "}
                                {booking.duration_type === "days"
                                  ? "day(s)"
                                  : "hour(s)"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <Button
              onClick={() => navigate(`/invoice/${paymentId}`)}
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Invoice
            </Button>
          </div>

          {/* Contact Information */}
          <div className="text-center mt-8 p-4 bg-white rounded-lg border">
            <p className="text-sm text-gray-600 mb-2">
              Need help with your booking? Contact our support team:
            </p>
            <div className="flex justify-center items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-green-600" />
                <span>+62 822 9999 7227</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-green-600" />
                <span>info@travelintrips.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
