import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Car, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";


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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  
  // State untuk kalkulasi
  const [pricePerDay, setPricePerDay] = useState(0);
  const [duration, setDuration] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [remainingPayment, setRemainingPayment] = useState(0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ State untuk Saldo Driver
  const [driverSaldo, setDriverSaldo] = useState<number | null>(null);
  const [showMinusWarning, setShowMinusWarning] = useState(false);

  // Fetch data dari database
  useEffect(() => {
    fetchDrivers();
    fetchVehicles();
    fetchPaymentMethods();
  }, []);

  // ✅ Realtime subscription untuk saldo driver
  useEffect(() => {
    if (!selectedDriverId) {
      setDriverSaldo(null);
      return;
    }

    // Fetch initial saldo
    const fetchDriverSaldo = async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("saldo")
        .eq("id", selectedDriverId)
        .single();

      if (!error && data) {
        setDriverSaldo(data.saldo || 0);
      }
    };

    fetchDriverSaldo();

    // ✅ Subscribe to realtime changes
    const channel = supabase
      .channel(`driver-saldo-${selectedDriverId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drivers",
          filter: `id=eq.${selectedDriverId}`,
        },
        (payload) => {
          if (payload.new && "saldo" in payload.new) {
            setDriverSaldo(payload.new.saldo || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDriverId]);

  // ✅ Check if saldo will be minus
  useEffect(() => {
    if (driverSaldo !== null && paymentMethodType === "Saldo" && paidAmount > 0) {
      const sisaSaldoDriver = driverSaldo - paidAmount;
      setShowMinusWarning(sisaSaldoDriver < 0);
    } else {
      setShowMinusWarning(false);
    }
  }, [driverSaldo, paidAmount, paymentMethodType]);

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
    return `SKD-${dateTime}-${random}-ADM`;
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
  setPricePerDay(selectedVehicle ? selectedVehicle.price || 0 : 0); // ✅ Gunakan price, bukan price_per_day
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
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
    // ✅ Check if saldo will be minus and show confirmation dialog
    if (showMinusWarning) {
      setShowConfirmDialog(true);
      return;
    }

    // Continue with booking submission
    await handleSubmitBooking();
  };

  // ✅ Actual booking submission function
  const handleSubmitBooking = async () => {
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
      const adminName = userData?.full_name || "Unknown Admin";

      // ✅ Get driver data untuk histori transaksi
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, user_id, name, role_name, saldo")
        .eq("id", selectedDriverId)
        .single();

      if (driverError) throw driverError;

      // ✅ Get vehicle data untuk booking
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("license_plate, make, model, type")
        .eq("id", selectedVehicleId)
        .single();

      if (vehicleError) throw vehicleError;

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

      // ✅ Extract time from datetime-local
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      const startTime = startDateTime.toTimeString().slice(0, 5); // HH:mm
      const endTime = endDateTime.toTimeString().slice(0, 5); // HH:mm

      // ✅ Create booking dengan data yang diperbaiki
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          code_booking: codeBooking, // ✅ Auto generate code booking
          // ✅ booking_id akan di-generate otomatis oleh database (UUID)
          user_id: user.id, // ✅ Staff/admin yang membuat booking
          driver_id: selectedDriverId, // ✅ Driver yang dipilih (UUID dari tabel drivers)
          vehicle_id: selectedVehicleId,
          booking_date: startDate, // ✅ Sama dengan start_date
          start_date: startDate,
          end_date: endDate,
          start_time: startTime, // ✅ Ambil dari form Tanggal Pengambilan
          end_time: endTime, // ✅ Ambil dari form Tanggal Pengembalian
          vehicle_type: vehicleData.type, // ✅ Dari tabel vehicles
          license_plate: vehicleData.license_plate, // ✅ Dari tabel vehicles
          make: vehicleData.make, // ✅ Dari tabel vehicles
          model: vehicleData.model, // ✅ Dari tabel vehicles
          total_amount: totalAmount,
          price: pricePerDay,
          payment_method: paymentMethodType,
          paid_amount: paidAmount,
          remaining_payment: remainingPayment,
          bank_name: bankName,
          payment_status: paymentStatus,
          status: "pending",
          notes_driver: notesDriver || null,
          saldo_awal: driverData.saldo || 0, // ✅ Saldo awal driver
          saldo_akhir: (driverData.saldo || 0) - paidAmount, // ✅ Saldo akhir driver
          created_by_role: driverData.role || "Driver Perusahaan", // ✅ Detect dari drivers.role
          created_by_admin_name: adminName, // ✅ Nama admin yang membuat booking
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // ✅ Insert ke histori_transaksi jika ada pembayaran
      if (paidAmount > 0) {
        const saldoAwal = driverData.saldo || 0;
        const saldoAkhir = saldoAwal - paidAmount;

        // Insert histori transaksi dengan data yang diperbaiki
        const { error: historiError } = await supabase
          .from("histori_transaksi")
          .insert({
            user_id: driverData.id, // ✅ ID dari drivers yang dipilih
            code_booking: codeBooking,
            nominal: paidAmount,
            saldo_awal: saldoAwal,
            saldo_akhir: saldoAkhir,
            keterangan: `Pembayaran Sewa Kendaraan - ${paymentMethodType}`,
            jenis_transaksi: "Sewa Kendaraan Driver",
            status: "pending",
            payment_method: paymentMethodType.toLowerCase(),
            bank_name: bankName || null,
            admin_id: user.id,
            admin_name: adminName, // ✅ Nama user yang sign in
            name: driverData.name, // ✅ Nama driver
            created_at: new Date().toISOString(), // ✅ Timestamp saat ini
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
            booking_id: bookingData.booking_id,
            user_id: driverData.id,
            payment_date: new Date().toISOString(),
            payment_method: paymentMethodType,
            total_amount: paidAmount,
            bank_name: bankName,
            code_booking: codeBooking,
            license_plate: vehicleData.license_plate,
            make: vehicleData.make,
            model: vehicleData.model,
            created_at: new Date().toISOString(),
            status: "paid",
          });

        if (paymentError) throw paymentError;
      }

      // Update vehicle status
      const { error: updateVehicleError } = await supabase
        .from("vehicles")
        .update({ status: "Rented" })
        .eq("id", selectedVehicleId);

      if (updateVehicleError) throw updateVehicleError;

      // ✅ Send WhatsApp notification setelah booking berhasil
      try {
        // Normalize phone number
        function normalizePhone(phone: string | undefined) {
          if (!phone) return "";
          phone = phone.replace(/\D/g, "").trim();
          if (phone.startsWith("0")) return "62" + phone.substring(1);
          if (phone.startsWith("62")) return phone;
          return phone;
        }

        const targetPhone = normalizePhone(driverData.phone_number);
        
        // Gabungkan grup + driver
        const targets = [
          "120363403813189599@g.us", // grup WA
          targetPhone,
        ].filter(Boolean);

        if (targets.length > 0) {
          const bookingDetails = `Booking berhasil dibuat!

Detail Booking:
- Type Kendaraan: ${vehicleData.type}
- Merk/Model: ${vehicleData.make} ${vehicleData.model}
- Plat Nomor: ${vehicleData.license_plate}
- Tanggal: ${new Date(startDate).toLocaleDateString("id-ID")}
- Waktu: ${startTime}
- Total: Rp ${totalAmount.toLocaleString("id-ID")}
- Status: ${paymentStatus === "paid" ? "Pembayaran Berhasil" : paymentStatus === "partial" ? "Pembayaran Sebagian" : "Belum Bayar"}
- Driver: ${driverData.name}${targetPhone ? ` (${targetPhone})` : ""}
- Booking ID: ${codeBooking}`;

          const { data: result, error: fnError } = await supabase.functions.invoke(
            "supabase-functions-send-whatsapp",
            {
              body: {
                target: targets,
                message: bookingDetails,
              },
            }
          );

          if (fnError) {
            console.error("❌ Edge Function error:", fnError);
          } else if (!result?.success) {
            console.error("❌ Fonnte API error:", result?.error || result?.data);
          } else {
            console.log("✅ WhatsApp notification sent successfully:", result.data);
          }
        }
      } catch (notificationError) {
        console.error("Error sending WhatsApp notification:", notificationError);
        // Don't fail the booking if notification fails
      }

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
      
      // ✅ Auto close form setelah 1 detik
      setTimeout(() => {
        onClose();
      }, 1000);

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

      {/* ✅ Saldo Driver - Muncul setelah driver dipilih */}
      {selectedDriverId && driverSaldo !== null && (
        <div className="space-y-2">
          <Label>Saldo Driver</Label>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-500 text-white text-base px-4 py-2">
              {formatCurrency(driverSaldo)}
            </Badge>
          </div>
        </div>
      )}

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
        
        {/* ✅ Sisa Saldo Driver - Muncul setelah driver dipilih dan ada pembayaran */}
        {selectedDriverId && driverSaldo !== null && paidAmount > 0 && (
          <div className={`flex justify-between font-bold ${
            driverSaldo - paidAmount < 0 ? "text-red-600" : "text-green-600"
          }`}>
            <span>Sisa Saldo Driver:</span>
            <span>{formatCurrency(driverSaldo - paidAmount)}</span>
          </div>
        )}
      </div>

      {/* ✅ Dialog Konfirmasi Saldo Minus */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-center flex items-center justify-center gap-2">
              ⚠️ Peringatan Saldo
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-center font-semibold">
              Saldo Driver akan minus setelah transaksi ini!
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Saldo Saat Ini:</span>
                <strong className="text-blue-600 text-lg">
                  {formatCurrency(driverSaldo || 0)}
                </strong>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Nominal Pembayaran:</span>
                <strong className="text-red-600 text-lg">
                  {formatCurrency(paidAmount)}
                </strong>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Sisa Saldo Driver:</span>
                  <strong className="text-red-600 text-xl">
                    {formatCurrency((driverSaldo || 0) - paidAmount)}
                  </strong>
                </div>
              </div>
            </div>
            
            <p className="text-center text-sm text-gray-600">
              Apakah Anda yakin ingin melanjutkan transaksi ini?
            </p>
          </div>
          
          <DialogFooter className="flex gap-3 sm:justify-center">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 text-base font-bold"
              onClick={() => {
                handleSubmitBooking();
                setShowConfirmDialog(false);
              }}
            >
              ✅ Lanjutkan
            </Button>
            <Button 
              variant="destructive"
              className="px-8 py-2 text-base font-bold"
              onClick={() => setShowConfirmDialog(false)}
            >
              ❌ Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing Booking...</span>
          </div>
        ) : (
          "✓ Buat Pesanan"
        )}
      </Button>
    </div>
  );
}