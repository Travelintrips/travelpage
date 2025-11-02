import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { processPayment } from "@/lib/paymentService";
import { CreditCard, Wallet, Building2, ArrowLeft } from "lucide-react";
import { useParams } from "react-router-dom";

export default function AirportTransferPreview() {
  const { previewCode } = useParams();
  const [data, setData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [bankName, setBankName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<
    "idle" | "processing" | "complete"
  >("idle");
  const [progress, setProgress] = useState<number>(0);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!previewCode) return;

      const { data: record, error } = await supabase
        .from("airport_transfer_preview")
        .select("data")
        .eq("preview_code", previewCode)
        .single();

      console.log("Fetching preview with code:", previewCode);
      console.log("Supabase result:", record, error);

      if (error || !record) {
        console.error("Preview not found", error);
        navigate("/airport-transfer");
        return;
      }

      setData(record.data);
      setLoading(false);
    };

    fetchPreview();
  }, [previewCode]);

  if (loading) return <div className="p-4">Loading preview...</div>;

  if (!data) return <div>Loading...</div>;

  async function handleConfirm() {
    setIsLoading(true);
    try {
      // Get current user if logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Ensure customer_id is set if user is logged in
      const bookingData = { ...data };
      if (user) {
        bookingData.customer_id = user.id;
      }

      // 1. Insert into airport_transfer table
      const { data: bookingResult, error: bookingError } = await supabase
        .from("airport_transfer")
        .insert([bookingData])
        .select()
        .single();

      if (bookingError) {
        throw new Error("Gagal menyimpan booking: " + bookingError.message);
      }

      // 2. Process payment directly to airport_transfer_payments table
      const airportTransferId = bookingResult.id;
      const userId = user ? user.id : "guest-user"; // Use authenticated user ID if available or default to guest

      // Generate a unique ID for guest users
      const effectiveUserId =
        userId === "guest-user"
          ? `guest-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
          : userId;

      // Insert directly into airport_transfer_payments table
      const { data: paymentRecord, error: paymentError } = await supabase
        .from("airport_transfer_payments")
        .insert({
          user_id: effectiveUserId,
          airport_transfer_id: airportTransferId,
          amount: data.price,
          payment_method: paymentMethod,
          status: "completed",
          bank_name: paymentMethod === "bank" ? bankName : null,
          is_partial_payment: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (paymentError) {
        throw new Error("Gagal memproses pembayaran: " + paymentError.message);
      }

      // ✅ Booking dan pembayaran berhasil
      setProcessingStage("processing");
      localStorage.removeItem("airport_preview");

      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setProgress(currentProgress);

        if (currentProgress >= 100) {
          clearInterval(interval);
          setProcessingStage("complete");

          setTimeout(() => {
            navigate("/");
          }, 800); // delay sebelum redirect
        }
      }, 200); // tiap 200ms naik 10%
    } catch (error: any) {
      alert(error.message);
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Preview Summary</h1>
      <ul className="space-y-2">
        <li>
          <strong>Airport Location:</strong> {data.airport_location}
        </li>
        <li>
          <strong>Customer Name:</strong> {data.customer_name}
        </li>
        <li>
          <strong>Phone:</strong> {data.phone}
        </li>
        <li>
          <strong>Pickup Location:</strong> {data.pickup_location}
        </li>
        <li>
          <strong>Dropoff Location:</strong> {data.dropoff_location}
        </li>
        <li>
          <strong>Passenger:</strong> {data.passenger}
        </li>
        <li>
          <strong>Date:</strong> {data.pickup_date}
        </li>
        <li>
          <strong>Time:</strong> {data.pickup_time}
        </li>
        <li>
          <strong>Vehicle Type:</strong> {data.type}
        </li>
        <li>
          <strong>Driver Name:</strong> {data.driver_name || "–"}
        </li>

        <li>
          <strong>Price:</strong> Rp{" "}
          {Number(data.price).toLocaleString("id-ID")}
        </li>
        <li>
          <strong>Booking Code:</strong> {data.booking_code}
        </li>
      </ul>

      {/* Payment Method Selection */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Select Payment Method</h2>
        <RadioGroup
          value={paymentMethod}
          onValueChange={setPaymentMethod}
          className="space-y-3"
        >
          <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50">
            <RadioGroupItem value="cash" id="cash" />
            <Label htmlFor="cash" className="flex items-center cursor-pointer">
              <Wallet className="mr-2 h-5 w-5 text-green-600" />
              Cash
            </Label>
          </div>

          <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50">
            <RadioGroupItem value="card" id="card" />
            <Label htmlFor="card" className="flex items-center cursor-pointer">
              <CreditCard className="mr-2 h-5 w-5 text-blue-600" />
              Credit/Debit Card
            </Label>
          </div>

          <div className="flex flex-col space-y-2 border p-3 rounded-md hover:bg-gray-50">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bank" id="bank" />
              <Label
                htmlFor="bank"
                className="flex items-center cursor-pointer"
              >
                <Building2 className="mr-2 h-5 w-5 text-purple-600" />
                Bank Transfer
              </Label>
            </div>

            {paymentMethod === "bank" && (
              <div className="ml-7 mt-2">
                <select
                  className="w-full p-2 border rounded-md"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                >
                  <option value="">Select Bank</option>
                  <option value="BCA">BCA</option>
                  <option value="Mandiri">Mandiri</option>
                  <option value="BNI">BNI</option>
                  <option value="BRI">BRI</option>
                  <option value="CIMB Niaga">CIMB Niaga</option>
                </select>
              </div>
            )}
          </div>
        </RadioGroup>
      </div>

      {/* Payment logos */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <img
          src="https://travelintrips.co.id/wp-content/uploads/2025/05/visa-1.jpg"
          alt="Visa"
          className="h-8"
        />
        <img
          src="https://travelintrips.co.id/wp-content/uploads/2025/05/MasterCard_Logo.svg.png"
          alt="Mastercard"
          className="h-8"
        />
        <img
          src="https://travelintrips.co.id/wp-content/uploads/2025/05/paypal.png"
          alt="PayPal"
          className="h-8"
        />
      </div>

      {processingStage === "processing" && (
        <div className="fixed inset-0 z-50 bg-white bg-opacity-80 flex flex-col items-center justify-center">
          <p className="text-lg text-gray-800 mb-4 font-medium animate-pulse">
            Processing Booking...
          </p>
          <div className="w-2/3 bg-gray-300 rounded-full h-4 overflow-hidden">
            <div
              className="bg-green-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <Button
        onClick={handleConfirm}
        className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-3"
        disabled={isLoading || (paymentMethod === "bank" && !bankName)}
      >
        {isLoading ? "Processing..." : "Confirm & Pay Now"}
      </Button>

      <Button
        onClick={() => navigate("/airport-transfer")}
        variant="outline"
        className="mt-4 w-full text-gray-700 border-gray-300 flex items-center justify-center"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit
      </Button>
    </div>
  );
}