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

interface BookingFormDriverProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookingFormDriver({ onClose, onSuccess }: BookingFormDriverProps) {
  const { user, userRole } = useAuth();

  // ✅ Check permission using userRole from AuthContext
  const allowedRoles = ["Super Admin", "Admin", "Staff Admin", "Staff Traffic"];
  const canCreateBooking = userRole && allowedRoles.includes(userRole);

  const { toast } = useToast();
  
  // State untuk data dari database
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // State untuk form
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethodType, setPaymentMethodType] = useState("GoPay");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [notesDriver, setNotesDriver] = useState("");
  
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
        .select("id, model, license_plate, price, status, make,type")
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

  // ✅ Generate code_booking dengan format SKD-${dateTime}-${random}-S
  const generateCodeBooking = () => {
    const now = new Date();
    const dateTime = now.toISOString()
      .replace(/[-:T]/g, '')
      .slice(0, 14); // Format: YYYYMMDDHHmmss
    
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // ✅ Penambahan huruf "S" menandakan booking dibuat oleh admin
    return `SKD-${dateTime}-${random}-S`;
  };

  // Get unique models
  // 1️⃣ Ambil daftar unik merek (make)
const uniqueMake = Array.from(new Set(vehicles.map(v => v.make)));

// 2️⃣ Ambil daftar model berdasarkan make yang dipilih
const filteredModels =
  selectedMake && vehicles.length > 0
    ? vehicles
        .filter(v => v.make === selectedMake)
        .map(v => v.model)
        .filter((model, index, self) => self.indexOf(model) === index) // hapus duplikat
    : [];

// 3️⃣ Ambil daftar kendaraan spesifik berdasarkan make & model
const filteredVehicles =
  selectedMake && selectedModel
    ? vehicles.filter(
        v => v.make === selectedMake && v.model === selectedModel
      )
    : [];

// 4️⃣ Saat make dipilih
const handleMakeChange = (make: string) => {
  setSelectedMake(make);
  setSelectedModel(""); // reset model
  setSelectedVehicleId("");
  setPricePerDay(0);
};

// 5️⃣ Saat model dipilih
const handleModelChange = (model: string) => {
  setSelectedModel(model);

  const selectedVehicle = vehicles.find(
    v => v.make === selectedMake && v.model === model
  );

  setSelectedVehicleId(selectedVehicle ? selectedVehicle.id : "");
  setPricePerDay(selectedVehicle ? selectedVehicle.price_per_day || 0 : 0);
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

      // Get current user (staff/admin yang membuat booking)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // ✅ Get admin name from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;
      const adminName = userData?.name || "Unknown Admin";

      // ✅ Get driver data untuk histori transaksi
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("user_id, name")
        .eq("id", selectedDriverId)
        .single();

      if (driverError) throw driverError;

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

      // ✅ Generate code_booking dengan penanda "S"
      const codeBooking = generateCodeBooking();

      // ✅ Create booking dengan code_booking dan created_by_admin_name
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          code_booking: codeBooking, // ✅ Code booking dengan penanda "S"
          user_id: user.id, // ✅ Staff/admin yang membuat booking
          driver_id: selectedDriverId, // ✅ Driver yang dipilih (UUID dari tabel drivers)
          vehicle_id: selectedVehicleId,
          start_date: startDate,
          end_date: endDate,
          total_amount: totalAmount,
          price: pricePerDay,
          payment_method: paymentMethodType,
          paid_amount: paidAmount,
          remaining_payment: remainingPayment,
          bank_name: bankName,
          payment_status: paymentStatus,
          status: "pending",
          notes_driver: notesDriver || null,
          created_by_role: "Driver Perusahaan",
          created_by_admin_name: adminName, // ✅ Nama admin yang membuat booking
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // ✅ Insert ke histori_transaksi jika ada pembayaran
      if (paidAmount > 0) {
        // Get driver's current saldo
        const { data: driverSaldo, error: saldoError } = await supabase
          .from("drivers")
          .select("saldo")
          .eq("id", selectedDriverId)
          .single();

        if (saldoError) throw saldoError;

        const saldoAwal = driverSaldo?.saldo || 0;
        const saldoAkhir = saldoAwal - paidAmount;

        // Insert histori transaksi
        const { error: historiError } = await supabase
          .from("histori_transaksi")
          .insert({
            user_id: driverData.user_id, // ✅ user_id dari driver
            code_booking: codeBooking,
            nominal: paidAmount,
            saldo_awal: saldoAwal,
            saldo_akhir: saldoAkhir,
            keterangan: `Pembayaran Sewa Kendaraan - ${paymentMethodType}`,
            jenis_transaksi: "Sewa Kendaraan Driver",
            status: "completed",
            payment_method: paymentMethodType.toLowerCase(),
            bank_name: bankName || null,
            admin_id: user.id,
            admin_name: adminName,
            name: driverData.name, // ✅ Nama driver
            trans_date: new Date().toISOString(),
          });

        if (historiError) throw historiError;

        // Update driver saldo
        const { error: updateSaldoError } = await supabase
          .from("drivers")
          .update({ saldo: saldoAkhir })
          .eq("id", selectedDriverId);

        if (updateSaldoError) throw updateSaldoError;
      }

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
            payment_method: paymentMethodType,
            total_amount: paidAmount,
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
        description: `Code Booking: ${codeBooking}`,
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
      setNotesDriver("");

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
        <p className="text-red-500">You don't have permission to create bookings1.</p>
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
  {/* Pilih Merk */}
  <div className="space-y-2">
    <Label>Pilih Merk</Label>
    <select
      className="w-full border rounded px-3 py-2 h-12"
      value={selectedMake}
      onChange={(e) => handleMakeChange(e.target.value)}
    >
      <option value="">Select Merk</option>
      {uniqueMake.map((make) => (
        <option key={make} value={make}>
          {make}
        </option>
      ))}
    </select>
  </div>

  {/* Pilih Model */}
  <div className="space-y-2">
    <Label>Pilih Model</Label>
    <select
      className="w-full border rounded px-3 py-2 h-12"
      value={selectedModel}
      onChange={(e) => handleModelChange(e.target.value)}
    >
      <option value="">Select Model</option>
      {filteredModels.map((model) => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  </div>

  {/* Pilih Plat Nomor */}
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

  {/* Tipe Kendaraan - langsung muncul */}
  <div className="space-y-2">
    <Label>Tipe Kendaraan</Label>
    <div className="w-full border rounded px-3 py-2 h-12 flex items-center bg-gray-50">
      {selectedVehicleId
        ? filteredVehicles.find((v) => v.id === selectedVehicleId)?.type || "-"
        : "-"}
    </div>
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