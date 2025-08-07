import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  CreditCard,
  Landmark,
  Banknote,
  CheckCircle,
  AlertCircle,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  bank_name?: string;
  account_number?: number;
  account_holder?: string;
  provider?: string;
  api_key?: string;
  is_active: boolean;
}

interface BookingSummary {
  id: string;
  customer_name?: string;
  total_amount: number;
  booking_type: string;
  details: any;
}

interface PaymentFormProps {
  bookingId?: string;
  totalAmount?: number;
  damageAmount?: number;
  onPaymentComplete?: () => void;
}

const paymentSchema = z.object({
  payment_method_id: z.string().min(1, "Please select a payment method"),
  amount: z.coerce
    .number()
    .min(1, { message: "Amount must be greater than 0" }),
  transfer_reference: z.string().optional(),
});

const PaymentForm: React.FC<PaymentFormProps> = ({
  bookingId: propBookingId,
  totalAmount: propTotalAmount,
  damageAmount: propDamageAmount = 0,
  onPaymentComplete,
}) => {
  const { bookingId: paramBookingId } = useParams<{ bookingId: string }>();
  const bookingId = propBookingId || paramBookingId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bookingSummary, setBookingSummary] = useState<BookingSummary | null>(
    null,
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_method_id: "",
      amount: 0,
      transfer_reference: "",
    },
  });

  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };

    getUserId();
    fetchPaymentMethods();
    if (bookingId) {
      fetchBookingSummary();
    }
  }, [bookingId]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (err) {
      console.error("Error fetching payment methods:", err);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    }
  };

  const fetchBookingSummary = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);

      // Try different booking tables based on common patterns
      const bookingTables = [
        {
          table: "bookings",
          nameField: "customer_name",
          amountField: "total_amount",
        },
        {
          table: "airport_transfer",
          nameField: "customer_name",
          amountField: "price",
        },
        {
          table: "baggage_booking",
          nameField: "customer_name",
          amountField: "price",
        },
        {
          table: "booking_cars",
          nameField: "customer_name",
          amountField: "sell_price",
        },
        {
          table: "handling_bookings",
          nameField: "customer_name",
          amountField: "total_price",
        },
      ];

      let bookingData = null;
      let bookingType = "unknown";

      for (const { table, nameField, amountField } of bookingTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("id", bookingId)
            .single();

          if (!error && data) {
            bookingData = data;
            bookingType = table;
            break;
          }
        } catch (err) {
          // Continue to next table
          continue;
        }
      }

      if (!bookingData) {
        throw new Error("Booking not found");
      }

      // Try to get customer name from various sources
      let customerName = "Customer"; // default fallback

      // First try booking data fields
      if (bookingData.customer_name) {
        customerName = bookingData.customer_name;
      } else if (bookingData.user_name) {
        customerName = bookingData.user_name;
      } else if (bookingData.name) {
        customerName = bookingData.name;
      } else if (bookingData.full_name) {
        customerName = bookingData.full_name;
      } else {
        // Try to get from user data if available
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.user_metadata?.name) {
            customerName = userData.user.user_metadata.name;
          } else if (userData?.user?.user_metadata?.full_name) {
            customerName = userData.user.user_metadata.full_name;
          } else if (userData?.user?.email) {
            // Use email as last resort, extract name part
            customerName = userData.user.email.split("@")[0];
          }
        } catch (err) {
          console.log("Could not fetch user data for customer name");
        }
      }

      const summary: BookingSummary = {
        id: bookingId,
        customer_name: customerName,
        total_amount:
          bookingData.total_amount ||
          bookingData.price ||
          bookingData.sell_price ||
          0,
        booking_type: bookingType,
        details: bookingData,
      };

      setBookingSummary(summary);
      const finalAmount = propTotalAmount || summary.total_amount;
      form.setValue("amount", finalAmount + propDamageAmount);
    } catch (err) {
      console.error("Error fetching booking summary:", err);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodChange = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    setSelectedPaymentMethod(method || null);
    form.setValue("payment_method_id", methodId);
  };

  const onSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (isSubmitting || !bookingSummary || !selectedPaymentMethod) return;

    // Handle cases where userId might be null or empty
    let finalUserId = userId;
    if (!userId || userId.trim() === "") {
      // Generate a proper UUID for guest users
      finalUserId = crypto.randomUUID();
    }

    // Validate that we have a proper booking ID
    if (!bookingId || bookingId.trim() === "") {
      toast({
        title: "Error",
        description: "Invalid booking ID. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Determine payment status based on method type
      const status =
        selectedPaymentMethod.type === "manual" ? "pending" : "processing";

      let paymentRecord;
      let paymentError;

      // Insert payment record into the appropriate table based on booking type
      if (bookingSummary.booking_type === "airport_transfer") {
        // For airport transfers, use the airport_transfer_payments table
        // Convert bookingId to integer for airport_transfer_id
        const airportTransferId = parseInt(bookingId);

        if (isNaN(airportTransferId) || !bookingId) {
          throw new Error(`Invalid airport transfer ID: ${bookingId}`);
        }

        const airportPaymentData = {
          airport_transfer_id: airportTransferId,
          user_id: finalUserId,
          amount: values.amount,
          payment_method: selectedPaymentMethod.name,
          bank_name:
            selectedPaymentMethod.type === "manual"
              ? selectedPaymentMethod.bank_name
              : null,
          transaction_id:
            selectedPaymentMethod.type === "manual"
              ? values.transfer_reference
              : null,
          status: status,
          status_payment: status,
          created_at: new Date().toISOString(),
        };

        const result = await supabase
          .from("airport_transfer_payments")
          .insert(airportPaymentData)
          .select()
          .single();

        paymentRecord = result.data;
        paymentError = result.error;
      } else {
        // For other booking types (bookings, booking_cars, etc.), use the payments table
        // Check if this is a handling booking to use the correct field
        const isHandlingBooking =
          bookingSummary.booking_type === "handling_bookings";

        // First insert into payments table
        const paymentData = {
          booking_id: isHandlingBooking
            ? bookingSummary.details.booking_id // UUID from handling booking details
            : bookingId, // For other booking types, use the provided booking ID
          code_booking: isHandlingBooking
            ? bookingSummary.details.code_booking // Text-based code from handling booking details
            : bookingId, // For other booking types, use the provided booking ID as code
          amount: values.amount,
          payment_method: selectedPaymentMethod.name,
          bank_name:
            selectedPaymentMethod.type === "manual"
              ? selectedPaymentMethod.bank_name
              : null,
          transaction_id:
            selectedPaymentMethod.type === "manual"
              ? values.transfer_reference || null
              : null,
          status: status,
          user_id: finalUserId,
          created_at: new Date().toISOString(),
        };

        const result = await supabase
          .from("payments")
          .insert(paymentData)
          .select()
          .single();

        paymentRecord = result.data;
        paymentError = result.error;

        // If payments insert was successful, also insert into payment_bookings
        if (!paymentError && paymentRecord) {
          const paymentBookingData = {
            booking_id: isHandlingBooking
              ? bookingSummary.details.booking_id // UUID from handling booking details
              : bookingId, // For other booking types, use the provided booking ID
            code_booking: isHandlingBooking
              ? bookingSummary.details.code_booking // Text-based code from handling booking details
              : bookingId, // For other booking types, use the provided booking ID as code
            booking_type: isHandlingBooking
              ? "handling"
              : bookingSummary.booking_type,
            created_at: new Date().toISOString(),
          };

          const { error: paymentBookingError } = await supabase
            .from("payment_bookings")
            .insert(paymentBookingData);

          if (paymentBookingError) {
            console.error(
              "Error inserting payment booking:",
              paymentBookingError,
            );
          }
        }
      }

      if (paymentError) throw paymentError;

      // Handle Paylabs payment gateway
      if (
        selectedPaymentMethod.provider === "paylabs" &&
        selectedPaymentMethod.type === "gateway"
      ) {
        try {
          // Get Paylabs configuration
          const { data: paylabsConfig, error: configError } = await supabase
            .from("paylabs_config")
            .select("*")
            .eq("mode", selectedPaymentMethod.mode || "sandbox")
            .single();

          if (configError || !paylabsConfig) {
            throw new Error(
              "Paylabs configuration not found. Please contact support.",
            );
          }

          // Prepare Paylabs API request
          const paylabsEndpoint =
            paylabsConfig.mode === "production"
              ? "https://api.paylabs.co.id/payment"
              : "https://sandbox-api.paylabs.io/payment";

          const paylabsPayload = {
            order_id: `INV-${paymentRecord.id}`,
            amount: values.amount,
            payment_method: selectedPaymentMethod.payment_code || "bni_va",
            customer: {
              name: bookingSummary.customer_name || "Customer",
              email: "customer@example.com", // You might want to get this from booking data
            },
          };

          console.log("Sending request to Paylabs:", {
            endpoint: paylabsEndpoint,
            payload: paylabsPayload,
          });

          // Make request to Paylabs API
          const paylabsResponse = await fetch(paylabsEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${paylabsConfig.public_key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(paylabsPayload),
          });

          if (!paylabsResponse.ok) {
            const errorText = await paylabsResponse.text();
            console.error("Paylabs API error:", {
              status: paylabsResponse.status,
              statusText: paylabsResponse.statusText,
              body: errorText,
            });
            throw new Error(
              `Paylabs API error: ${paylabsResponse.status} - ${errorText}`,
            );
          }

          const paylabsData = await paylabsResponse.json();
          console.log("Paylabs response:", paylabsData);

          // Update payment record with Paylabs response data
          const updateData: any = {
            paylabs_transaction_id:
              paylabsData.transaction_id || paylabsData.id,
            status: "pending",
            updated_at: new Date().toISOString(),
          };

          if (paylabsData.va_number) {
            updateData.va_number = paylabsData.va_number;
          }
          if (paylabsData.payment_url) {
            updateData.payment_url = paylabsData.payment_url;
          }

          const { error: updateError } = await supabase
            .from("payments")
            .update(updateData)
            .eq("id", paymentRecord.id);

          if (updateError) {
            console.error(
              "Error updating payment with Paylabs data:",
              updateError,
            );
          }

          // Show success message with payment details
          toast({
            title: "Payment Created Successfully",
            description: paylabsData.va_number
              ? `Virtual Account: ${paylabsData.va_number}`
              : "Payment has been created. Please complete the payment.",
            variant: "default",
          });

          // Redirect to thank you page with payment details
          setTimeout(() => {
            if (onPaymentComplete) {
              onPaymentComplete();
            } else {
              navigate(`/thank-you/${paymentRecord.id}`);
            }
          }, 2000);
        } catch (paylabsError) {
          console.error("Paylabs integration error:", paylabsError);
          toast({
            title: "Payment Gateway Error",
            description: `Failed to process payment through Paylabs: ${paylabsError.message}`,
            variant: "destructive",
          });
          return;
        }
      } else if (selectedPaymentMethod.type === "gateway") {
        // Handle other gateway payments
        if (selectedPaymentMethod.provider && selectedPaymentMethod.api_key) {
          toast({
            title: "Redirecting to Payment Gateway",
            description: `You will be redirected to ${selectedPaymentMethod.provider} to complete your payment.`,
          });

          setTimeout(() => {
            window.open(
              `https://${selectedPaymentMethod.provider?.toLowerCase()}.com/payment`,
              "_blank",
            );
          }, 2000);
        }
      } else {
        // Handle manual payments
        setPaymentSuccess(true);
        toast({
          title: "Payment Initiated",
          description:
            "Your payment is being processed. Please wait for confirmation.",
          variant: "default",
        });

        // Reset form
        form.reset();

        // Redirect after success
        setTimeout(() => {
          if (onPaymentComplete) {
            onPaymentComplete();
          } else {
            navigate("/bookings");
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Payment submission error:", error);
      toast({
        title: "Payment Failed",
        description: `An error occurred: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  };

  if (loading && !bookingSummary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!bookingSummary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Booking Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The booking you're looking for could not be found.
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Booking Summary */}
        <Card className="bg-background border shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Booking Summary
            </CardTitle>
            <CardDescription>
              Review your booking details before making payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer Name</p>
                <p className="font-medium">{bookingSummary.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booking ID</p>
                <p className="font-medium">{bookingSummary.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booking Type</p>
                <p className="font-medium capitalize">
                  {bookingSummary.booking_type.replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-lg text-primary">
                  Rp{" "}
                  {(
                    (propTotalAmount || bookingSummary.total_amount) +
                    propDamageAmount
                  ).toLocaleString()}
                </p>
                {propDamageAmount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    (Including damage fees: Rp{" "}
                    {propDamageAmount.toLocaleString()})
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="bg-background border shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Complete Payment
            </CardTitle>
            <CardDescription>
              Choose your preferred payment method and complete the transaction
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Payment Method Selection */}
                <FormField
                  control={form.control}
                  name="payment_method_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={handlePaymentMethodChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                <div className="flex items-center gap-2">
                                  {method.type === "manual" ? (
                                    <Landmark className="h-4 w-4" />
                                  ) : (
                                    <CreditCard className="h-4 w-4" />
                                  )}
                                  {method.name}
                                  {method.bank_name && (
                                    <span className="text-muted-foreground">
                                      ({method.bank_name})
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment Method Details */}
                {selectedPaymentMethod && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">
                      {selectedPaymentMethod.name} Details
                    </h3>

                    {selectedPaymentMethod.type === "manual" && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Bank Name</p>
                            <p className="font-medium">
                              {selectedPaymentMethod.bank_name}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Account Number
                            </p>
                            <p className="font-medium">
                              {selectedPaymentMethod.account_number}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Account Holder
                            </p>
                            <p className="font-medium">
                              {selectedPaymentMethod.account_holder}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Please transfer the exact amount to the account above
                          and enter the transfer reference below.
                        </p>
                      </div>
                    )}

                    {selectedPaymentMethod.type === "gateway" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          <p className="text-sm">
                            You will be redirected to{" "}
                            {selectedPaymentMethod.provider} to complete your
                            payment securely.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount Field */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (Rp)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          {...field}
                          readOnly
                        />
                      </FormControl>
                      <FormDescription>
                        Total amount to be paid: Rp{" "}
                        {(
                          (propTotalAmount || bookingSummary.total_amount) +
                          propDamageAmount
                        ).toLocaleString()}
                        {propDamageAmount > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            (Base: Rp{" "}
                            {(
                              propTotalAmount || bookingSummary.total_amount
                            ).toLocaleString()}{" "}
                            + Damage: Rp {propDamageAmount.toLocaleString()})
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transfer Reference (for manual payments) */}
                {selectedPaymentMethod?.type === "manual" && (
                  <FormField
                    control={form.control}
                    name="transfer_reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transfer Reference Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter transfer reference number"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the reference number from your bank transfer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || isSubmitting || !selectedPaymentMethod}
                >
                  {loading
                    ? "Processing..."
                    : selectedPaymentMethod?.type === "gateway"
                      ? "Proceed to Payment Gateway"
                      : "Complete Payment"}
                </Button>
              </form>
            </Form>

            {paymentSuccess && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <div>
                  <p className="text-green-700 font-medium">
                    Payment Initiated Successfully!
                  </p>
                  <p className="text-green-600 text-sm">
                    {selectedPaymentMethod?.type === "manual"
                      ? "Your payment is being processed. You will receive a confirmation once verified."
                      : "You will be redirected to complete the payment."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentForm;
