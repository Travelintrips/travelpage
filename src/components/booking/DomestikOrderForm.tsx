import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  MapPin,
  Package,
  Loader2,
  CheckCircle2,
  ShoppingCart,
  ArrowRight,
  AlertTriangle,
  Bird,
  Fish,
  Shield,
  Truck,
  PackageCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface TarifResult {
  kota_asal: string;
  kota_tujuan: string;
  berat_aktual: number;
  berat_dihitung: number;
  harga_per_kg: number;
  total_harga: number;
}

interface DomestikOrderFormProps {
  open: boolean;
  onClose: () => void;
  tarifResult: TarifResult;
}

const TIPE_KARGO = [
  "General Cargo",
  "Dangerous Goods",
  "Live Animals",
  "Marine Products",
  "Perishable Goods",
  "Valuable Cargo",
  "Fragile Cargo",
  "Electronics",
  "Pharmaceutical",
  "Documents",
  "Automotive Parts",
  "Machinery",
  "Fashion & Garment",
  "Seafood",
  "Fresh Food",
  "Frozen Product",
];

// Tipe yang memerlukan special handling section
const SPECIAL_TIPE = ["Dangerous Goods", "Live Animals", "Marine Products"];

const DomestikOrderForm: React.FC<DomestikOrderFormProps> = ({
  open,
  onClose,
  tarifResult,
}) => {
  const { addToCart } = useShoppingCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useAuth();

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [kodeOrder, setKodeOrder] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Validation ───────────────────────────────────────────────────
  const validateStep = (s: 1 | 2 | 3): boolean => {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!form.nama_pengirim.trim()) errs.nama_pengirim = "Nama pengirim wajib diisi";
      if (!form.telepon_pengirim.trim()) errs.telepon_pengirim = "Telepon pengirim wajib diisi";
      if (!form.nama_penerima.trim()) errs.nama_penerima = "Nama penerima wajib diisi";
      if (!form.telepon_penerima.trim()) errs.telepon_penerima = "Telepon penerima wajib diisi";
      if (!tarifResult.kota_asal) errs.asal = "Kota asal wajib diisi";
      if (!tarifResult.kota_tujuan) errs.tujuan = "Kota tujuan wajib diisi";
    }

    if (s === 2) {
      if (!form.deskripsi_barang.trim()) errs.deskripsi_barang = "Deskripsi barang wajib diisi";
      if (!form.jumlah_koli || Number(form.jumlah_koli) < 1) errs.jumlah_koli = "Jumlah koli minimal 1";
      if (tarifResult.berat_aktual < 1) errs.berat_aktual = "Berat aktual minimal 1 kg";
      if (form.panjang && Number(form.panjang) < 0) errs.panjang = "Panjang tidak boleh negatif";
      if (form.lebar && Number(form.lebar) < 0) errs.lebar = "Lebar tidak boleh negatif";
      if (form.tinggi && Number(form.tinggi) < 0) errs.tinggi = "Tinggi tidak boleh negatif";
      if (form.tipe_kargo === "Dangerous Goods") {
        if (!form.dg_un_number.trim()) errs.dg_un_number = "UN Number wajib diisi untuk Dangerous Goods";
        if (!form.dg_msds.trim()) errs.dg_msds = "MSDS wajib diisi untuk Dangerous Goods";
        if (!form.dg_packing_instruction.trim()) errs.dg_packing_instruction = "Packing instruction wajib diisi";
        if (!form.dg_declaration) errs.dg_declaration = "Deklarasi DG harus disetujui";
      }
    }

    if (s === 3) {
      if (form.insurance_required && !form.declared_value.trim())
        errs.declared_value = "Nilai barang wajib diisi jika asuransi aktif";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => (s + 1) as 1 | 2 | 3);
    }
  };

  // Form data
  const [form, setForm] = useState({
    // Pengirim
    nama_pengirim: "",
    perusahaan_pengirim: "",
    telepon_pengirim: "",
    email_pengirim: "",
    alamat_pengirim: "",
    // Penerima
    nama_penerima: "",
    perusahaan_penerima: "",
    telepon_penerima: "",
    email_penerima: "",
    alamat_penerima: "",
    // Kargo
    tipe_kargo: "",
    deskripsi_barang: "",
    jumlah_koli: "1",
    panjang: "",
    lebar: "",
    tinggi: "",
    // Dangerous Goods
    dg_un_number: "",
    dg_msds: "",
    dg_packing_instruction: "",
    dg_declaration: false,
    // Live Animals
    la_jenis_hewan: "",
    la_jumlah: "",
    la_ventilasi: "",
    la_feeding_instruction: "",
    // Marine Products
    mp_kondisi: "" as "" | "fresh" | "frozen",
    mp_suhu: "",
    mp_jenis_kemasan: "",
    mp_ice_gel_pack: false,
    // Layanan tambahan
    special_handling_notes: "",
    pickup_required: false,
    pickup_address: "",
    pickup_date: "",
    pickup_time: "",
    packing_required: false,
    insurance_required: false,
    declared_value: "",
    catatan: "",
  });

  const set = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  };

  // Weight calculations
  // Berat volume = (P x L x T) / 6000
  const beratVolume =
    form.panjang && form.lebar && form.tinggi
      ? Math.ceil(
          (Number(form.panjang) * Number(form.lebar) * Number(form.tinggi)) /
            6000,
        )
      : 0;
  // Berat chargeable = max(berat_aktual, berat_volume)
  const beratChargeable = Math.max(tarifResult.berat_aktual, beratVolume);
  // Warning: volume weight is bigger than actual weight
  const isVolumeWeightHigher = beratVolume > 0 && beratVolume > tarifResult.berat_aktual;

  // Pricing breakdown
  // subtotal = berat_chargeable × tarif_per_kg
  const subtotal = beratChargeable * tarifResult.harga_per_kg;
  const biayaAdmin = 20000;
  // ppn = 1.1% × subtotal (only on subtotal, not on admin fee)
  const ppn = Math.round(subtotal * 0.011);
  // total = subtotal + biaya_admin + ppn
  const total = subtotal + biayaAdmin + ppn;

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setLoading(true);
    const payload = {
      asal: tarifResult.kota_asal,
      tujuan: tarifResult.kota_tujuan,
      // Pengirim
      nama_pengirim: form.nama_pengirim,
      perusahaan_pengirim: form.perusahaan_pengirim || null,
      telepon_pengirim: form.telepon_pengirim,
      email_pengirim: form.email_pengirim || null,
      alamat_pengirim: form.alamat_pengirim,
      // Penerima
      nama_penerima: form.nama_penerima,
      perusahaan_penerima: form.perusahaan_penerima || null,
      telepon_penerima: form.telepon_penerima,
      email_penerima: form.email_penerima || null,
      alamat_penerima: form.alamat_penerima,
      // Kargo
      tipe_kargo: form.tipe_kargo || null,
      deskripsi_barang: form.deskripsi_barang || null,
      jumlah_koli: Number(form.jumlah_koli) || 1,
      berat_aktual: tarifResult.berat_aktual,
      panjang: form.panjang ? Number(form.panjang) : null,
      lebar: form.lebar ? Number(form.lebar) : null,
      tinggi: form.tinggi ? Number(form.tinggi) : null,
      berat_volume: beratVolume || null,
      berat_chargeable: beratChargeable,
      // Harga (recalculated from berat_chargeable)
      tarif_per_kg: tarifResult.harga_per_kg,
      subtotal,
      biaya_admin: biayaAdmin,
      ppn,
      total,
      // Special handling details
      is_dangerous_goods: form.tipe_kargo === "Dangerous Goods",
      dg_un_number: form.tipe_kargo === "Dangerous Goods" ? form.dg_un_number || null : null,
      dg_msds: form.tipe_kargo === "Dangerous Goods" ? form.dg_msds || null : null,
      dg_packing_instruction: form.tipe_kargo === "Dangerous Goods" ? form.dg_packing_instruction || null : null,
      dg_declaration: form.tipe_kargo === "Dangerous Goods" ? form.dg_declaration : false,
      is_live_animals: form.tipe_kargo === "Live Animals",
      la_jenis_hewan: form.tipe_kargo === "Live Animals" ? form.la_jenis_hewan || null : null,
      la_jumlah: form.tipe_kargo === "Live Animals" && form.la_jumlah ? Number(form.la_jumlah) : null,
      la_ventilasi: form.tipe_kargo === "Live Animals" ? form.la_ventilasi || null : null,
      la_feeding_instruction: form.tipe_kargo === "Live Animals" ? form.la_feeding_instruction || null : null,
      is_marine_products: form.tipe_kargo === "Marine Products",
      mp_kondisi: form.tipe_kargo === "Marine Products" ? form.mp_kondisi || null : null,
      mp_suhu: form.tipe_kargo === "Marine Products" ? form.mp_suhu || null : null,
      mp_jenis_kemasan: form.tipe_kargo === "Marine Products" ? form.mp_jenis_kemasan || null : null,
      mp_ice_gel_pack: form.tipe_kargo === "Marine Products" ? form.mp_ice_gel_pack : false,
      special_handling_notes: form.special_handling_notes || null,
      pickup_required: form.pickup_required,
      pickup_address: form.pickup_required ? form.pickup_address : null,
      pickup_date: form.pickup_required && form.pickup_date ? form.pickup_date : null,
      pickup_time: form.pickup_required ? form.pickup_time : null,
      packing_required: form.packing_required,
      insurance_required: form.insurance_required,
      declared_value:
        form.insurance_required && form.declared_value
          ? Number(form.declared_value)
          : null,
      catatan: form.catatan || null,
      status: "cart",
      user_id: userId || null,
    };

    const { data, error } = await supabase
      .from("order_domestik_kargo")
      .insert(payload)
      .select("id, kode_order")
      .single();

    if (error || !data) {
      setLoading(false);
      alert("Gagal menyimpan pesanan: " + (error?.message ?? "Unknown error"));
      return;
    }

    // Add to shopping_cart so it appears in the Cart feature
    const cartResult = await addToCart({
      item_type: "domestik_kargo",
      service_name: `Kargo Domestik: ${tarifResult.kota_asal} → ${tarifResult.kota_tujuan}`,
      price: total,
      quantity: 1,
      booking_type: "domestik_kargo",
      code_booking: data.kode_order,
      details: {
        order_id: data.id,
        kode_order: data.kode_order,
        asal: tarifResult.kota_asal,
        tujuan: tarifResult.kota_tujuan,
        berat_aktual: tarifResult.berat_aktual,
        berat_volume: beratVolume,
        berat_chargeable: beratChargeable,
        tarif_per_kg: tarifResult.harga_per_kg,
        nama_pengirim: form.nama_pengirim,
        nama_penerima: form.nama_penerima,
      },
    });

    setLoading(false);
    if (cartResult.success) {
      setKodeOrder(data.kode_order);
      setSuccess(true);
      toast({
        title: "Pesanan berhasil ditambahkan ke Keranjang",
        description: `Kode Order: ${data.kode_order}`,
      });
    } else {
      // Order saved but cart insert failed — still show success
      setKodeOrder(data.kode_order);
      setSuccess(true);
      toast({
        title: "Pesanan berhasil disimpan",
        description: `Kode Order: ${data.kode_order}. Catatan: gagal sinkron ke keranjang.`,
      });
      console.warn("[DomestikOrderForm] Cart insert failed:", cartResult.error);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSuccess(false);
    setKodeOrder("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Form Pemesanan Kargo
            </DialogTitle>
          </div>
          {/* Route summary */}
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-green-50 rounded-xl px-4 py-3">
            <MapPin className="h-4 w-4 text-green-600 shrink-0" />
            <span className="font-semibold text-gray-800">
              {tarifResult.kota_asal}
            </span>
            <ArrowRight className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-gray-800">
              {tarifResult.kota_tujuan}
            </span>
            <span className="ml-auto font-bold text-green-700">
              {formatRupiah(total)}
            </span>
          </div>
          {/* Step indicator */}
          {!success && (
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      step === s
                        ? "bg-green-600 text-white"
                        : step > s
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <span>{s}</span>
                    <span>{s === 1 ? "Data Pengirim & Penerima" : s === 2 ? "Detail Kargo" : "Layanan Tambahan"}</span>
                  </div>
                  {s < 3 && <div className="flex-1 h-px bg-gray-200" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="px-6 py-4">
          {success ? (
            /* Success State */
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Pesanan Berhasil Dibuat!
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Pesanan Anda telah dimasukkan ke keranjang.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 mb-6">
                <div className="text-xs text-gray-500 mb-1">Kode Order</div>
                <div className="text-2xl font-extrabold text-green-700 tracking-widest">
                  {kodeOrder}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={() => { handleClose(); navigate("/cart"); }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Lihat Keranjang
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Tutup
                </Button>
              </div>
            </div>
          ) : step === 1 ? (
            /* Step 1: Pengirim & Penerima */
            <div className="space-y-6">
              {/* Validation error summary */}
              {Object.keys(errors).length > 0 && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <strong>Harap lengkapi data berikut:</strong>
                    <ul className="list-disc ml-4 mt-1 space-y-0.5">
                      {Object.values(errors).map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                  </div>
                </div>
              )}
              {/* Pengirim */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" /> Data Pengirim
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-500 mb-1 block">Nama Pengirim *</Label>
                    <Input
                      placeholder="Nama lengkap pengirim"
                      value={form.nama_pengirim}
                      onChange={(e) => set("nama_pengirim", e.target.value)}
                      className={errors.nama_pengirim ? "border-red-400" : ""}
                    />
                    {errors.nama_pengirim && <p className="text-xs text-red-500 mt-1">{errors.nama_pengirim}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Perusahaan</Label>
                    <Input
                      placeholder="Nama perusahaan (opsional)"
                      value={form.perusahaan_pengirim}
                      onChange={(e) => set("perusahaan_pengirim", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">No. Telepon *</Label>
                    <Input
                      placeholder="08xxxxxxxxxx"
                      value={form.telepon_pengirim}
                      onChange={(e) => set("telepon_pengirim", e.target.value)}
                      className={errors.telepon_pengirim ? "border-red-400" : ""}
                    />
                    {errors.telepon_pengirim && <p className="text-xs text-red-500 mt-1">{errors.telepon_pengirim}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Email</Label>
                    <Input
                      type="email"
                      placeholder="email@contoh.com"
                      value={form.email_pengirim}
                      onChange={(e) => set("email_pengirim", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-500 mb-1 block">Alamat Pengirim *</Label>
                    <Textarea
                      placeholder="Alamat lengkap pengirim"
                      rows={2}
                      value={form.alamat_pengirim}
                      onChange={(e) => set("alamat_pengirim", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Penerima */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" /> Data Penerima
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-500 mb-1 block">Nama Penerima *</Label>
                    <Input
                      placeholder="Nama lengkap penerima"
                      value={form.nama_penerima}
                      onChange={(e) => set("nama_penerima", e.target.value)}
                      className={errors.nama_penerima ? "border-red-400" : ""}
                    />
                    {errors.nama_penerima && <p className="text-xs text-red-500 mt-1">{errors.nama_penerima}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Perusahaan</Label>
                    <Input
                      placeholder="Nama perusahaan (opsional)"
                      value={form.perusahaan_penerima}
                      onChange={(e) => set("perusahaan_penerima", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">No. Telepon *</Label>
                    <Input
                      placeholder="08xxxxxxxxxx"
                      value={form.telepon_penerima}
                      onChange={(e) => set("telepon_penerima", e.target.value)}
                      className={errors.telepon_penerima ? "border-red-400" : ""}
                    />
                    {errors.telepon_penerima && <p className="text-xs text-red-500 mt-1">{errors.telepon_penerima}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Email</Label>
                    <Input
                      type="email"
                      placeholder="email@contoh.com"
                      value={form.email_penerima}
                      onChange={(e) => set("email_penerima", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-500 mb-1 block">Alamat Penerima *</Label>
                    <Textarea
                      placeholder="Alamat lengkap penerima"
                      rows={2}
                      value={form.alamat_penerima}
                      onChange={(e) => set("alamat_penerima", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : step === 2 ? (
            /* Step 2: Detail Kargo */
            <div className="space-y-4">
              {/* Validation error summary */}
              {Object.keys(errors).length > 0 && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <strong>Harap lengkapi data berikut:</strong>
                    <ul className="list-disc ml-4 mt-1 space-y-0.5">
                      {Object.values(errors).map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tipe Kargo - full width */}
                <div className="sm:col-span-2">
                  <Label className="text-xs text-gray-500 mb-1 block">Tipe Kargo *</Label>
                  <Select value={form.tipe_kargo} onValueChange={(v) => set("tipe_kargo", v)}>
                    <SelectTrigger className={SPECIAL_TIPE.includes(form.tipe_kargo) ? "border-orange-400 bg-orange-50" : ""}>
                      <SelectValue placeholder="Pilih tipe kargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General Cargo">📦 General Cargo</SelectItem>
                      <SelectItem value="Dangerous Goods">⚠️ Dangerous Goods</SelectItem>
                      <SelectItem value="Live Animals">🐾 Live Animals</SelectItem>
                      <SelectItem value="Marine Products">🐟 Marine Products</SelectItem>
                      <SelectItem value="Perishable Goods">🌿 Perishable Goods</SelectItem>
                      <SelectItem value="Valuable Cargo">💎 Valuable Cargo</SelectItem>
                      <SelectItem value="Fragile Cargo">🔮 Fragile Cargo</SelectItem>
                      <SelectItem value="Electronics">💻 Electronics</SelectItem>
                      <SelectItem value="Pharmaceutical">💊 Pharmaceutical</SelectItem>
                      <SelectItem value="Documents">📄 Documents</SelectItem>
                      <SelectItem value="Automotive Parts">🔧 Automotive Parts</SelectItem>
                      <SelectItem value="Machinery">⚙️ Machinery</SelectItem>
                      <SelectItem value="Fashion & Garment">👗 Fashion & Garment</SelectItem>
                      <SelectItem value="Seafood">🦐 Seafood</SelectItem>
                      <SelectItem value="Fresh Food">🥦 Fresh Food</SelectItem>
                      <SelectItem value="Frozen Product">❄️ Frozen Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs text-gray-500 mb-1 block">Deskripsi Barang *</Label>
                  <Textarea
                    placeholder="Deskripsi singkat isi kargo"
                    rows={2}
                    value={form.deskripsi_barang}
                    onChange={(e) => set("deskripsi_barang", e.target.value)}
                    className={errors.deskripsi_barang ? "border-red-400" : ""}
                  />
                  {errors.deskripsi_barang && <p className="text-xs text-red-500 mt-1">{errors.deskripsi_barang}</p>}
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Jumlah Koli *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.jumlah_koli}
                    onChange={(e) => set("jumlah_koli", e.target.value)}
                    className={errors.jumlah_koli ? "border-red-400" : ""}
                  />
                  {errors.jumlah_koli && <p className="text-xs text-red-500 mt-1">{errors.jumlah_koli}</p>}
                </div>
              </div>

              {/* Special Handling: Dangerous Goods */}
              {form.tipe_kargo === "Dangerous Goods" && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Dangerous Goods — Informasi Wajib
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">UN Number *</Label>
                      <Input
                        placeholder="Contoh: UN1234"
                        value={form.dg_un_number}
                        onChange={(e) => set("dg_un_number", e.target.value)}
                        className={errors.dg_un_number ? "border-red-500" : "border-red-300 focus:border-red-500"}
                      />
                      {errors.dg_un_number && <p className="text-xs text-red-500 mt-1">{errors.dg_un_number}</p>}
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">No. MSDS / Safety Data Sheet *</Label>
                      <Input
                        placeholder="Nomor atau referensi MSDS"
                        value={form.dg_msds}
                        onChange={(e) => set("dg_msds", e.target.value)}
                        className={errors.dg_msds ? "border-red-500" : "border-red-300 focus:border-red-500"}
                      />
                      {errors.dg_msds && <p className="text-xs text-red-500 mt-1">{errors.dg_msds}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-gray-600 mb-1 block">Packing Instruction *</Label>
                      <Input
                        placeholder="Contoh: PI965, PI966, P001..."
                        value={form.dg_packing_instruction}
                        onChange={(e) => set("dg_packing_instruction", e.target.value)}
                        className={errors.dg_packing_instruction ? "border-red-500" : "border-red-300 focus:border-red-500"}
                      />
                      {errors.dg_packing_instruction && <p className="text-xs text-red-500 mt-1">{errors.dg_packing_instruction}</p>}
                    </div>
                    <div className="sm:col-span-2 flex items-start gap-2 bg-white border border-red-200 rounded-lg px-3 py-2">
                      <Checkbox
                        id="dg_declaration"
                        checked={form.dg_declaration}
                        onCheckedChange={(v) => set("dg_declaration", !!v)}
                        className={errors.dg_declaration ? "border-red-500" : ""}
                      />
                      <div>
                        <label htmlFor="dg_declaration" className="text-sm text-red-800 cursor-pointer font-medium">
                          Saya menyatakan bahwa kargo ini telah dikemas sesuai regulasi IATA DGR dan siap untuk penerbangan
                        </label>
                        {errors.dg_declaration && <p className="text-xs text-red-500 mt-0.5">{errors.dg_declaration}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Handling: Live Animals */}
              {form.tipe_kargo === "Live Animals" && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                    <Bird className="h-4 w-4" />
                    Live Animals — Informasi Hewan
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Jenis Hewan *</Label>
                      <Input
                        placeholder="Contoh: Kucing, Anjing, Burung..."
                        value={form.la_jenis_hewan}
                        onChange={(e) => set("la_jenis_hewan", e.target.value)}
                        className="border-amber-300"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Jumlah Hewan *</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Jumlah ekor"
                        value={form.la_jumlah}
                        onChange={(e) => set("la_jumlah", e.target.value)}
                        className="border-amber-300"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Persyaratan Ventilasi</Label>
                      <Input
                        placeholder="Contoh: Ventilasi 4 sisi min. 20%"
                        value={form.la_ventilasi}
                        onChange={(e) => set("la_ventilasi", e.target.value)}
                        className="border-amber-300"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Feeding Instruction</Label>
                      <Input
                        placeholder="Instruksi makan/minum selama perjalanan"
                        value={form.la_feeding_instruction}
                        onChange={(e) => set("la_feeding_instruction", e.target.value)}
                        className="border-amber-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Special Handling: Marine Products */}
              {form.tipe_kargo === "Marine Products" && (
                <div className="bg-blue-50 border border-blue-300 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                    <Fish className="h-4 w-4" />
                    Marine Products — Persyaratan Penanganan
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Kondisi *</Label>
                      <Select value={form.mp_kondisi} onValueChange={(v) => set("mp_kondisi", v as "fresh" | "frozen")}>
                        <SelectTrigger className="border-blue-300">
                          <SelectValue placeholder="Pilih kondisi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fresh">🌊 Fresh (Segar)</SelectItem>
                          <SelectItem value="frozen">❄️ Frozen (Beku)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Suhu Penyimpanan</Label>
                      <Input
                        placeholder="Contoh: 0-4°C / -18°C"
                        value={form.mp_suhu}
                        onChange={(e) => set("mp_suhu", e.target.value)}
                        className="border-blue-300"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Jenis Kemasan</Label>
                      <Input
                        placeholder="Contoh: Styrofoam box, Vacuum pack"
                        value={form.mp_jenis_kemasan}
                        onChange={(e) => set("mp_jenis_kemasan", e.target.value)}
                        className="border-blue-300"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2 h-fit mt-auto">
                      <Checkbox
                        id="mp_ice_gel_pack"
                        checked={form.mp_ice_gel_pack}
                        onCheckedChange={(v) => set("mp_ice_gel_pack", !!v)}
                      />
                      <label htmlFor="mp_ice_gel_pack" className="text-sm text-blue-800 cursor-pointer">
                        Membutuhkan Ice / Gel Pack
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Dimensi */}
              <div>
                <Label className="text-xs text-gray-500 mb-2 block font-medium">
                  Dimensi Barang (cm)
                  <span className="font-normal text-gray-400 ml-1">— opsional, untuk menghitung berat volume</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-gray-400 mb-1 block">Panjang (cm)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.panjang}
                      onChange={(e) => set("panjang", e.target.value)}
                      className={errors.panjang ? "border-red-400" : ""}
                    />
                    {errors.panjang && <p className="text-xs text-red-500 mt-1">{errors.panjang}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400 mb-1 block">Lebar (cm)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.lebar}
                      onChange={(e) => set("lebar", e.target.value)}
                      className={errors.lebar ? "border-red-400" : ""}
                    />
                    {errors.lebar && <p className="text-xs text-red-500 mt-1">{errors.lebar}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400 mb-1 block">Tinggi (cm)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.tinggi}
                      onChange={(e) => set("tinggi", e.target.value)}
                      className={errors.tinggi ? "border-red-400" : ""}
                    />
                    {errors.tinggi && <p className="text-xs text-red-500 mt-1">{errors.tinggi}</p>}
                  </div>
                </div>
                {form.panjang && form.lebar && form.tinggi && (
                  <p className="text-xs text-blue-500 mt-1.5">
                    Formula: ({form.panjang} × {form.lebar} × {form.tinggi}) ÷ 6000 = <strong>{beratVolume} kg</strong>
                  </p>
                )}
              </div>

              {/* Volume weight warning */}
              {isVolumeWeightHigher && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    <strong>Berat volume lebih besar dari berat aktual</strong>, sehingga tarif dihitung berdasarkan{" "}
                    <strong>berat chargeable ({beratChargeable} kg)</strong>.
                  </p>
                </div>
              )}

              {/* Kalkulasi Berat & Harga — full breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Kalkulasi Berat &amp; Harga
                  </span>
                </div>

                {/* Weight section */}
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                      <div className="text-base font-bold text-gray-800">
                        {tarifResult.berat_aktual} kg
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">Berat Aktual</div>
                    </div>
                    <div className={`rounded-lg p-3 text-center border ${beratVolume > 0 ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}>
                      <div className={`text-base font-bold ${beratVolume > 0 ? "text-blue-700" : "text-gray-400"}`}>
                        {beratVolume > 0 ? `${beratVolume} kg` : "—"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">Berat Volume</div>
                    </div>
                    <div className={`rounded-lg p-3 text-center border-2 ${isVolumeWeightHigher ? "border-amber-400 bg-amber-50" : "border-green-400 bg-green-50"}`}>
                      <div className={`text-base font-extrabold ${isVolumeWeightHigher ? "text-amber-700" : "text-green-700"}`}>
                        {beratChargeable} kg
                      </div>
                      <div className={`text-xs font-semibold mt-0.5 ${isVolumeWeightHigher ? "text-amber-600" : "text-green-600"}`}>
                        Berat Chargeable
                      </div>
                      <div className="text-xs text-gray-400">max(aktual, vol)</div>
                    </div>
                  </div>

                  {/* Pricing breakdown */}
                  <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Tarif per kg</span>
                      <span className="font-medium">{formatRupiah(tarifResult.harga_per_kg)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({beratChargeable} kg × {formatRupiah(tarifResult.harga_per_kg)})</span>
                      <span className="font-medium">{formatRupiah(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Biaya Admin</span>
                      <span>{formatRupiah(biayaAdmin)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>PPN 1,1% (× subtotal)</span>
                      <span>{formatRupiah(ppn)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-700 text-base pt-1.5 border-t border-slate-200">
                      <span>Total</span>
                      <span>{formatRupiah(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Step 3: Layanan Tambahan */
            <div className="space-y-5">
              {/* Validation error summary */}
              {Object.keys(errors).length > 0 && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <strong>Harap lengkapi data berikut:</strong>
                    <ul className="list-disc ml-4 mt-1 space-y-0.5">
                      {Object.values(errors).map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-green-600" />
                  Opsi Layanan Tambahan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Pickup */}
                  <label
                    htmlFor="pickup_required"
                    className={`flex flex-col gap-1 border-2 rounded-xl p-3 cursor-pointer transition-colors ${
                      form.pickup_required
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="pickup_required"
                        checked={form.pickup_required}
                        onCheckedChange={(v) => set("pickup_required", !!v)}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        <Truck className="h-3.5 w-3.5 inline mr-1 text-green-600" />
                        Pickup Barang
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      Jemput kargo di lokasi Anda
                    </p>
                  </label>

                  {/* Packing */}
                  <label
                    htmlFor="packing_required"
                    className={`flex flex-col gap-1 border-2 rounded-xl p-3 cursor-pointer transition-colors ${
                      form.packing_required
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="packing_required"
                        checked={form.packing_required}
                        onCheckedChange={(v) => set("packing_required", !!v)}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        <Package className="h-3.5 w-3.5 inline mr-1 text-blue-600" />
                        Jasa Packing
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      Pengemasan profesional
                    </p>
                  </label>

                  {/* Insurance */}
                  <label
                    htmlFor="insurance_required"
                    className={`flex flex-col gap-1 border-2 rounded-xl p-3 cursor-pointer transition-colors ${
                      form.insurance_required
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="insurance_required"
                        checked={form.insurance_required}
                        onCheckedChange={(v) => set("insurance_required", !!v)}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        <Shield className="h-3.5 w-3.5 inline mr-1 text-purple-600" />
                        Asuransi Kargo
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      Perlindungan nilai barang
                    </p>
                  </label>
                </div>
              </div>

              {/* Pickup Detail */}
              {form.pickup_required && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                  <h5 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Detail Penjemputan
                  </h5>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Alamat Pickup *</Label>
                    <Textarea
                      placeholder="Alamat lengkap lokasi penjemputan barang"
                      rows={2}
                      value={form.pickup_address}
                      onChange={(e) => set("pickup_address", e.target.value)}
                      className="border-green-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Tanggal Pickup *</Label>
                      <Input
                        type="date"
                        value={form.pickup_date}
                        onChange={(e) => set("pickup_date", e.target.value)}
                        className="border-green-300"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Jam Pickup *</Label>
                      <Input
                        type="time"
                        value={form.pickup_time}
                        onChange={(e) => set("pickup_time", e.target.value)}
                        className="border-green-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Insurance Detail */}
              {form.insurance_required && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                  <h5 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Detail Asuransi
                  </h5>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Declared Value / Nilai Barang (Rp) *</Label>
                    <Input
                      type="number"
                      placeholder="Nilai barang yang akan diasuransikan"
                      value={form.declared_value}
                      onChange={(e) => set("declared_value", e.target.value)}
                      className={errors.declared_value ? "border-red-400" : "border-purple-300"}
                    />
                    {errors.declared_value
                      ? <p className="text-xs text-red-500 mt-1">{errors.declared_value}</p>
                      : <p className="text-xs text-purple-600 mt-1">Premi asuransi ≈ 0,2% dari nilai deklarasi</p>
                    }
                  </div>
                </div>
              )}

              {/* Special Handling Notes */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">
                  Special Handling Notes
                </Label>
                <Textarea
                  placeholder="Instruksi penanganan khusus yang perlu diketahui tim kargo..."
                  rows={2}
                  value={form.special_handling_notes}
                  onChange={(e) => set("special_handling_notes", e.target.value)}
                />
              </div>

              {/* Catatan */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Catatan Tambahan Customer</Label>
                <Textarea
                  placeholder="Instruksi lain, permintaan khusus, atau informasi tambahan untuk pengirim/penerima..."
                  rows={3}
                  value={form.catatan}
                  onChange={(e) => set("catatan", e.target.value)}
                />
              </div>

              {/* Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Ringkasan Biaya
                  </span>
                  {isVolumeWeightHigher && (
                    <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
                      <AlertTriangle className="h-3 w-3" />
                      Berat volume digunakan
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2 text-sm">
                  {/* Weight rows */}
                  <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-200">
                    <div className="text-center bg-white border border-slate-200 rounded-lg p-2">
                      <div className="text-sm font-bold text-gray-800">{tarifResult.berat_aktual} kg</div>
                      <div className="text-xs text-gray-400 mt-0.5">Berat Aktual</div>
                    </div>
                    <div className={`text-center rounded-lg p-2 border ${beratVolume > 0 ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}>
                      <div className={`text-sm font-bold ${beratVolume > 0 ? "text-blue-700" : "text-gray-400"}`}>{beratVolume > 0 ? `${beratVolume} kg` : "—"}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Berat Volume</div>
                    </div>
                    <div className={`text-center rounded-lg p-2 border-2 ${isVolumeWeightHigher ? "border-amber-400 bg-amber-50" : "border-green-400 bg-green-50"}`}>
                      <div className={`text-sm font-extrabold ${isVolumeWeightHigher ? "text-amber-700" : "text-green-700"}`}>{beratChargeable} kg</div>
                      <div className={`text-xs font-semibold mt-0.5 ${isVolumeWeightHigher ? "text-amber-600" : "text-green-600"}`}>Chargeable</div>
                    </div>
                  </div>
                  {/* Price rows */}
                  <div className="space-y-1.5 text-gray-600">
                    <div className="flex justify-between">
                      <span>Tarif per kg</span>
                      <span className="font-medium text-gray-800">{formatRupiah(tarifResult.harga_per_kg)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal ({beratChargeable} kg × {formatRupiah(tarifResult.harga_per_kg)})</span>
                      <span className="font-medium text-gray-800">{formatRupiah(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya Admin</span>
                      <span>{formatRupiah(biayaAdmin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PPN 1,1%</span>
                      <span>{formatRupiah(ppn)}</span>
                    </div>
                    {form.insurance_required && form.declared_value && (
                      <div className="flex justify-between text-purple-700">
                        <span>Estimasi Premi Asuransi (0,2%)</span>
                        <span>{formatRupiah(Math.round(Number(form.declared_value) * 0.002))}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-green-700 text-base">
                    <span>Total</span>
                    <span>{formatRupiah(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setErrors({});
                step === 1 ? handleClose() : setStep((s) => (s - 1) as 1 | 2 | 3);
              }}
            >
              {step === 1 ? "Batal" : "Kembali"}
            </Button>
            {step < 3 ? (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
                onClick={handleNext}
              >
                Lanjut →
              </Button>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white min-w-[180px] gap-2"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {loading ? "Menyimpan..." : "Masukkan ke Keranjang"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DomestikOrderForm;
