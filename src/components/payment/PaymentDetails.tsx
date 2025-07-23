import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getPaymentsByBookingId } from "@/lib/paymentService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaymentDetailsProps {
  bookingId: number;
  onPaymentComplete?: () => void;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  bookingId,
  onPaymentComplete,
}) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Validate bookingId - handle both number and UUID formats
        if (!bookingId) {
          console.error("Missing booking ID");
          setError("Missing booking ID");
          setLoading(false);
          return;
        }

        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId.toString())
          .single();

        if (bookingError) throw bookingError;
        setBooking(bookingData);

        // Fetch payment details
        const {
          data: paymentsData,
          success,
          error: paymentsError,
        } = await getPaymentsByBookingId(bookingId);

        if (!success) {
          throw new Error(paymentsError?.message || "Failed to fetch payments");
        }
        setPayments(paymentsData || []);

        // Payments are now completely decoupled from damages
      } catch (err) {
        console.error("Error fetching payment details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchData();
    }
  }, [bookingId]);

  const calculateTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  const calculateRemainingAmount = () => {
    if (!booking) return 0;
    return booking.total_amount - calculateTotalPaid();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Validate bookingId - handle both number and UUID formats
      if (!bookingId) {
        console.error("Missing booking ID");
        setError("Missing booking ID");
        setLoading(false);
        return;
      }

      // Fetch booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId.toString())
        .single();

      if (bookingError) throw bookingError;
      setBooking(bookingData);

      // Fetch payment details
      const {
        data: paymentsData,
        success,
        error: paymentsError,
      } = await getPaymentsByBookingId(bookingId);

      if (!success) {
        throw new Error(paymentsError?.message || "Failed to fetch payments");
      }
      setPayments(paymentsData || []);

      // Payments are now completely decoupled from damages
    } catch (err) {
      console.error("Error fetching payment details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = (paymentData: any) => {
    // Refresh payment data
    fetchData();
    // Call the callback if provided
    if (onPaymentComplete) {
      onPaymentComplete();
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <p>Loading payment details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col justify-center items-center h-40 text-destructive">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Payment Details</CardTitle>
        <CardDescription>
          View payment history and remaining balance for booking #{bookingId}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {booking && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Booking Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                <p className="text-sm">Total Amount:</p>
                <p className="text-sm font-medium">
                  Rp {booking.total_amount?.toLocaleString()}
                </p>
                <p className="text-sm">Payment Status:</p>
                <p className="text-sm font-medium">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      booking.payment_status === "paid"
                        ? "bg-green-100 text-green-800"
                        : booking.payment_status === "partial"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {booking.payment_status?.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-3">Payment History</h3>
            {payments.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Bank
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-gray-200">
                    {payments.map((payment, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          Rp {payment.amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {payment.payment_method}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {payment.bank_name || "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              payment.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : payment.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {payment.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              payment.is_partial_payment
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {payment.is_partial_payment ? "PARTIAL" : "FULL"}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span className="text-muted-foreground">-</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm py-4 text-center">
                No payment records found.
              </div>
            )}
          </div>

          {booking && booking.payment_status !== "paid" && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-medium">Remaining Balance</h3>
                  <p className="text-lg font-bold">
                    Rp {calculateRemainingAmount().toLocaleString()}
                  </p>
                </div>
                <Button onClick={() => fetchData()}>
                  Refresh Payment Data
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentDetails;
