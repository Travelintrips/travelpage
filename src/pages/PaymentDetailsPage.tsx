import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getPaymentsByBookingId } from "@/lib/paymentService";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Check, CreditCard, AlertCircle, ArrowLeft } from "lucide-react";

interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

interface Booking {
  id: number;
  user_id: string;
  vehicle_id: number;
  start_date: string;
  end_date: string;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
  };
}

interface PaymentDetailsPageProps {
  id?: string;
}

const PaymentDetailsPage = ({ id: propId }: PaymentDetailsPageProps = {}) => {
  const params = useParams<{ id: string }>();
  const id = propId || params.id;
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to validate UUID format
  function isValidUUID(uuid: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    );
  }

  useEffect(() => {
    const fetchBookingDetails = async () => {
      setIsLoading(true);
      try {
        if (!id) {
          throw new Error("Booking ID is required");
        }

        // Validate booking ID format if it's supposed to be a UUID
        if (typeof id === "string" && !isValidUUID(id) && isNaN(Number(id))) {
          console.warn(`Invalid booking ID format: ${id}`);
          // Continue anyway to attempt to fetch the booking
        }

        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select(`*`)
          .eq("id", id)
          .single();

        if (bookingError) throw bookingError;
        if (!bookingData) throw new Error("Booking not found");

        setBooking(bookingData);

        // Fetch payment details - handle both numeric IDs and UUIDs
        let bookingIdNum;
        try {
          bookingIdNum = parseInt(id);
          if (isNaN(bookingIdNum)) {
            // If it's a UUID, we'll just use the ID as is for the query
            bookingIdNum = bookingData.id; // Use the ID from the booking we just fetched
          }
        } catch (err) {
          console.error("Error parsing booking ID:", err);
          bookingIdNum = bookingData.id; // Fallback to the ID from the booking
        }

        const paymentResult = await getPaymentsByBookingId(bookingIdNum);
        if (!paymentResult.success) {
          throw new Error("Failed to fetch payment details");
        }

        setPayments(paymentResult.data || []);
      } catch (err) {
        console.error("Error fetching booking details:", err);
        setError(
          err.message || "An error occurred while fetching booking details",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch (e) {
      return dateString;
    }
  };

  const getTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  const getRemainingAmount = () => {
    if (!booking) return 0;
    return Math.max(0, booking.total_amount - getTotalPaid());
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "pending":
      case "booked":
        return <Badge className="bg-pink-500">Booked</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "onride":
        return <Badge className="bg-purple-500">Onride</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case "unpaid":
        return <Badge className="bg-red-500">Unpaid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading payment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-3xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center gap-2">
            <AlertCircle size={20} />
            Error
          </CardTitle>
          <CardDescription>
            There was a problem loading the payment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!booking) {
    return (
      <Card className="max-w-3xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center gap-2">
            <AlertCircle size={20} />
            Not Found
          </CardTitle>
          <CardDescription>
            The requested booking could not be found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The booking with ID {id} does not exist or you don't have permission
            to view it.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="outline" className="mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Payment Details</CardTitle>
              <CardDescription>Booking #{booking.id}</CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                {getStatusBadge(booking.status)}
                {getPaymentStatusBadge(booking.payment_status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Created on {formatDate(booking.created_at)}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-3">Booking Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-medium">Vehicle ID: {booking.vehicle_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rental Period</p>
                <p className="font-medium">
                  {formatDate(booking.start_date)} -{" "}
                  {formatDate(booking.end_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium">
                  {formatCurrency(booking.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="font-medium">
                  {getStatusBadge(booking.status)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Payment History</h3>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-3 border rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payment.payment_method} •{" "}
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          payment.status.toLowerCase() === "completed"
                            ? "default"
                            : "outline"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No payment records found.</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-medium">
                {formatCurrency(booking.total_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-medium">
                {formatCurrency(getTotalPaid())}
              </span>
            </div>
            {getRemainingAmount() > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Remaining Balance:</span>
                <span className="font-bold">
                  {formatCurrency(getRemainingAmount())}
                </span>
              </div>
            )}
          </div>

          {booking.status === "pending" && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
              <p className="text-yellow-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Waiting for Admin Approval</span>
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Your booking is pending approval from an administrator. You will
                be notified once it's confirmed.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between">
          <Button variant="outline" onClick={() => navigate("/bookings")}>
            View All Bookings
          </Button>
          {getRemainingAmount() > 0 && (
            <Button className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Make Payment
            </Button>
          )}
          {booking.payment_status === "paid" &&
            booking.status === "confirmed" && (
              <Button className="flex items-center gap-2" variant="default">
                <Check className="h-4 w-4" />
                Proceed to Pickup
              </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentDetailsPage;
