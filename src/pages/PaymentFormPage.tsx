import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PaymentForm from "@/components/payment/PaymentForm";
import { supabase } from "@/lib/supabase";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [damageAmount, setDamageAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;

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
        ];

        let bookingData = null;
        let bookingType = "unknown";

        for (const { table, nameField, amountField } of bookingTables) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select("*")
              .eq("id", id)
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
          throw new Error("Booking not found in any table");
        }

        setBooking({
          ...bookingData,
          booking_type: bookingType,
          total_amount:
            bookingData.total_amount ||
            bookingData.price ||
            bookingData.sell_price ||
            0,
        });

        // Fetch damage fees for this booking (only for car bookings)
        if (bookingType === "bookings" || bookingType === "booking_cars") {
          const { data: damageData, error: damageError } = await supabase
            .from("damages")
            .select("amount")
            .eq("booking_id", bookingData.id)
            .eq("payment_status", "pending");

          if (damageError) {
            console.error("Error fetching damage fees:", damageError);
          } else {
            // Calculate total damage amount
            const totalDamage =
              damageData?.reduce((sum, item) => sum + (item.amount || 0), 0) ||
              0;
            setDamageAmount(totalDamage);
          }
        }
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Failed to load booking details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const handlePaymentComplete = () => {
    // Navigate back to booking details or dashboard
    navigate(`/admin/bookings`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center h-40">
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col justify-center items-center h-40 text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p>{error || "Booking not found"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-center">
        Payment for Booking #{booking.id}
      </h1>

      <PaymentForm
        bookingId={booking.id}
        totalAmount={booking.total_amount}
        damageAmount={damageAmount}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
};

export default PaymentFormPage;
