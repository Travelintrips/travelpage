import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Car } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Driver {
  id: string;
  name: string;
  driver_status: string;
}

interface Vehicle {
  id: string;
  model: string;
  license_plate: string;
  price: number;
  status: string;
}

interface PaymentMethod {
  id: string;
  method_name: string;
  bank_name?: string;
}

export default function BookingFormDriver({ onClose }: BookingFormDriverProps) {
  const { user, userRole } = useAuth();
  
  // Allow roles: 1 (Super Admin), 5 (Admin), 6 (Staff Admin), 13 (Staff Traffic), 99 (Staff Trips)
  const canCreateBooking = user?.role_id && [1, 5, 6, 13, 99].includes(user.role_id);
  
  const { toast } = useToast();
  
  // State untuk data dari database
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // State untuk form
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethodType, setPaymentMethodType] = useState("GoPay");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  
  // State untuk kalkulasi
  const [pricePerDay, setPricePerDay] = useState(0);
  const [duration, setDuration] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [remainingPayment, setRemainingPayment] = useState(0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data dari database
  useEffect(() => {
    fetchDrivers();
    fetchVehicles();
    fetchPaymentMethods();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, name, driver_status")
        .eq("driver_status", "standby")
        .order("name");

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, model, license_plate, price, status")
        .eq("status", "available")
        .order("model");

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, method_name, bank_name")
        .order("method_name");

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  // Get unique models
  const uniqueModels = Array.from(new Set(vehicles.map(v => v.model)));

  // Filter vehicles by selected model
  const filteredVehicles = selectedModel
    ? vehicles.filter(v => v.model === selectedModel)
    : [];

  // Handle model selection
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setSelectedVehicleId("");
    setPricePerDay(0);
  };

  // Handle vehicle selection - Harga otomatis berdasarkan plat nomor kendaraan
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      // Harga otomatis berdasarkan plat nomor kendaraan yang dipilih
      setPricePerDay(vehicle.price);
    }
  };

  // Calculate duration and total when dates change
  // Durasi sewa: Selisih tanggal mulai dan berakhir
  // Total biaya: price_per_day × jumlah_hari
  // Sisa pembayaran: total - paidAmount
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDuration(diffDays);
      
      // Total biaya = price_per_day × jumlah_hari
      const total = diffDays * pricePerDay;
      setTotalAmount(total);
      
      // Sisa pembayaran = total - paidAmount
      setRemainingPayment(total - paidAmount);
    }
  }, [startDate, endDate, pricePerDay, paidAmount]);

  // Handle payment amount change
  const handlePaidAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    setPaidAmount(amount);
    // Sisa pembayaran = total - paidAmount
    setRemainingPayment(totalAmount - amount);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp");
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!selectedDriverId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a driver",
      });
      return;
    }

    if (!selectedVehicleId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a vehicle",
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select start and end dates",
      });
      return;
    }

    if (paymentMethodType === "Transfer" && !selectedBankId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a bank",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Determine payment status: Paid / Partial / Pending
      let paymentStatus = "pending";
      if (paidAmount >= totalAmount) {
        paymentStatus = "paid";
      } else if (paidAmount > 0) {
        paymentStatus = "partial";
      }

      // Get bank name if payment method is Transfer
      const bankName = paymentMethodType === "Transfer" 
        ? paymentMethods.find(pm => pm.id === selectedBankId)?.bank_name || ""
        : "";

      // Create booking with all required fields
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          driver_id: selectedDriverId,
          vehicle_id: selectedVehicleId,
          start_date: startDate,
          end_date: endDate,
          total_amount: totalAmount, // ✅ Added missing total_amount field
          price: pricePerDay,
          payment_type: paymentMethodType,
          paid_amount: paidAmount,
          remaining_payment: remainingPayment,
          bank_name: bankName,
          payment_status: paymentStatus, // ✅ Changed from 'status' to 'payment_status'
          status: "pending", // ✅ Set booking status to pending
          created_by_role: "Driver Perusahaan",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create payment record if payment amount > 0
      if (paidAmount > 0) {
        const paymentMethodName = paymentMethodType === "Transfer" 
          ? bankName
          : paymentMethodType;

        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            booking_id: bookingData.id,
            payment_date: new Date().toISOString(),
            payment_type: paymentMethodType,
            payment_amount: paidAmount,
            bank_name: bankName,
            status: "completed",
          });

        if (paymentError) throw paymentError;
      }

      // Update vehicle status
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ status: "booked" })
        .eq("id", selectedVehicleId);

      if (vehicleError) throw vehicleError;

      toast({
        title: "✅ Booking dan pembayaran berhasil disimpan!",
        description: "Booking kendaraan berhasil dibuat",
      });

      // Reset form
      setSelectedDriverId("");
      setSelectedModel("");
      setSelectedVehicleId("");
      setStartDate("");
      setEndDate("");
      setPaymentMethodType("GoPay");
      setSelectedBankId("");
      setPaidAmount(0);
      setPricePerDay(0);
      setDuration(0);
      setTotalAmount(0);
      setRemainingPayment(0);

      // Refresh data
      fetchDrivers();
      fetchVehicles();

      if (onSuccess) onSuccess();

    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create booking",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add check at the beginning of component render
  if (!canCreateBooking) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">You don't have permission to create bookings.</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {/* Pick Driver */}
      <div className="space-y-2">
        <Label>Pick Driver</Label>
        <select 
          className="w-full border rounded px-3 py-2"
          value={selectedDriverId}
          onChange={(e) => setSelectedDriverId(e.target.value)}
        >
          <option value="">Select Driver</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name} ({driver.driver_status})
            </option>
          ))}
        </select>
      </div>

      {/* Pilih Model & Plat Nomor */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Pilih Model</Label>
          <select
            className="w-full border rounded px-3 py-2 h-12"
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            <option value="">Select Model</option>
            {uniqueModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <Label>Plat Nomor</Label>
          <select
            className="w-full border rounded px-3 py-2 h-12"
            value={selectedVehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
            disabled={!selectedModel}
          >
            <option value="">Select Plat Nomor</option>
            {filteredVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.license_plate}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tanggal Pengambilan & Pengembalian */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Tanggal Pengambilan</Label>
          <Input 
            type="datetime-local" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Tanggal Pengembalian</Label>
          <Input 
            type="datetime-local" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Biaya Sewa & Total */}
      <div className="bg-blue-100 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Biaya sewa kendaraan:</span>
          <span className="font-medium">{formatCurrency(pricePerDay)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Durasi sewa:</span>
          <span className="font-medium">{duration} hari</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total Biaya:</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between font-bold text-blue-700">
          <span>Sisa Pembayaran:</span>
          <span>{formatCurrency(remainingPayment)}</span>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="space-y-2">
        <Label>Metode Pembayaran</Label>
        <div className="grid grid-cols-4 gap-2">
          <Button 
            variant={paymentMethodType === "GoPay" ? "default" : "outline"}
            className={paymentMethodType === "GoPay" ? "bg-blue-600 hover:bg-blue-700" : ""}
            onClick={() => setPaymentMethodType("GoPay")}
          >
            Gopay
          </Button>
          <Button 
            variant={paymentMethodType === "Saldo" ? "default" : "outline"}
            onClick={() => setPaymentMethodType("Saldo")}
          >
            Saldo
          </Button>
          <Button 
            variant={paymentMethodType === "Transfer" ? "default" : "outline"}
            onClick={() => setPaymentMethodType("Transfer")}
          >
            Transfer
          </Button>
          <Button 
            variant={paymentMethodType === "Cash" ? "default" : "outline"}
            onClick={() => setPaymentMethodType("Cash")}
          >
            Cash
          </Button>
        </div>
      </div>

      {/* Nominal Pembayaran & Bank */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Nominal Pembayaran</Label>
          <Input 
            type="number" 
            placeholder="Enter amount"
            value={paidAmount || ""}
            onChange={(e) => handlePaidAmountChange(e.target.value)}
          />
        </div>
        {paymentMethodType === "Transfer" && (
          <div className="space-y-2">
            <Label className="text-sm">Pilih Bank</Label>
            <select 
              className="w-full border rounded px-3 py-2"
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
            >
              <option value="">Select Bank</option>
              {paymentMethods
                .filter(pm => pm.bank_name)
                .map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.bank_name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button 
        className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Processing..." : "✓ Selesaikan Booking"}
      </Button>
    </div>
  );
}