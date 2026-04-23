import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plane,
  MapPin,
  Clock,
  Package,
  Shield,
  Truck,
  ChevronDown,
  Search,
  Star,
  ArrowRight,
  CheckCircle,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  X,
  ShoppingCart,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DomestikOrderForm from "@/components/booking/DomestikOrderForm";
import { useAuth } from "@/contexts/AuthContext";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";

interface TarifRow {
  id: string;
  kota_asal: string;
  kota_tujuan: string;
  harga_modal: number;
  harga_jual: number;
}

interface TarifResult {
  kota_asal: string;
  kota_tujuan: string;
  berat_aktual: number;
  berat_dihitung: number;
  harga_per_kg: number;
  total_harga: number;
}

const waNumbers = [
  { label: "+62 822 9999 7227", url: "https://wa.me/6282299997227" },
  { label: "+62 878 8456 3133", url: "https://wa.me/6287884563133" },
  { label: "+62 895 2512 6911", url: "https://wa.me/6289525126911" },
];

const waMessage = encodeURIComponent(
  "Halo, saya ingin bertanya mengenai layanan pengiriman domestik."
);

const DomestikPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isSessionReady } = useAuth();
  const [showWaModal, setShowWaModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [weight, setWeight] = useState("");
  const [kotaAsalList, setKotaAsalList] = useState<string[]>([]);
  const [kotaTujuanList, setKotaTujuanList] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingCek, setLoadingCek] = useState(false);
  const [tarifResult, setTarifResult] = useState<TarifResult | null>(null);
  const [tarifError, setTarifError] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);

  useEffect(() => {
    const fetchKota = async () => {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("domestik_transfer")
        .select("kota_asal, kota_tujuan");

      if (!error && data) {
        const asalSet = Array.from(new Set(data.map((r) => r.kota_asal))).sort();
        const tujuanSet = Array.from(new Set(data.map((r) => r.kota_tujuan))).sort();
        setKotaAsalList(asalSet);
        setKotaTujuanList(tujuanSet);
      }
      setLoadingData(false);
    };
    fetchKota();
  }, []);

  const handleCekTarif = async () => {
    setTarifResult(null);
    setTarifError(null);

    if (!origin) return setTarifError("Pilih kota asal terlebih dahulu.");
    if (!destination) return setTarifError("Pilih kota tujuan terlebih dahulu.");
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0)
      return setTarifError("Masukkan berat yang valid.");

    setLoadingCek(true);
    const beratAktual = Number(weight);
    const beratDihitung = beratAktual < 10 ? 10 : beratAktual;

    const { data, error } = await supabase
      .from("domestik_transfer")
      .select("*")
      .eq("kota_asal", origin)
      .eq("kota_tujuan", destination)
      .single();

    setLoadingCek(false);

    if (error || !data) {
      setTarifError("Tarif untuk rute ini tidak ditemukan.");
      return;
    }

    const row = data as TarifRow;
    const totalHarga = row.harga_jual * beratDihitung;

    setTarifResult({
      kota_asal: row.kota_asal,
      kota_tujuan: row.kota_tujuan,
      berat_aktual: beratAktual,
      berat_dihitung: beratDihitung,
      harga_per_kg: row.harga_jual,
      total_harga: totalHarga,
    });
  };

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const services = [
    {
      icon: <Plane className="h-8 w-8 text-green-600" />,
      title: "Air Freight",
      desc: "Pengiriman udara cepat ke seluruh Indonesia",
      time: "1-2 Hari",
      badge: "Terpopuler",
    },
    {
      icon: <Truck className="h-8 w-8 text-blue-600" />,
      title: "Darat (Trucking)",
      desc: "Pengiriman darat ekonomis antar kota",
      time: "2-5 Hari",
      badge: "Hemat",
    },
    {
      icon: <Package className="h-8 w-8 text-orange-600" />,
      title: "Door to Door",
      desc: "Jemput & antar langsung ke tujuan",
      time: "1-3 Hari",
      badge: "Praktis",
    },
    {
      icon: <Shield className="h-8 w-8 text-purple-600" />,
      title: "Special Cargo",
      desc: "Penanganan barang bernilai tinggi & fragile",
      time: "Sesuai Rute",
      badge: "Premium",
    },
  ];

  const destinations = [
    { city: "Jakarta", img: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=400&q=80", count: "120+ rute" },
    { city: "Surabaya", img: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&q=80", count: "85+ rute" },
    { city: "Bali", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80", count: "60+ rute" },
    { city: "Makassar", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80", count: "45+ rute" },
  ];

  const testimonials = [
    { name: "Budi S.", role: "Pemilik UMKM", text: "Kiriman tepat waktu, barang aman sampai tujuan!", stars: 5 },
    { name: "Rina A.", role: "Online Seller", text: "Layanan door to door sangat memudahkan bisnis saya.", stars: 5 },
    { name: "Hendra K.", role: "Eksportir", text: "Penanganan cargo khusus sangat profesional.", stars: 5 },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="bg-green-700 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
  src="/cst-logo.png"
  alt="CST Logistik"
  className="h-18 max-w-[170px] w-auto object-contain"
  onError={(e) => {
    console.error("Logo gagal dimuat:", e.currentTarget.src);
  }}
/>
            <span
              style={{ display: "none" }}
              className="text-white font-bold text-xl"
            >
              CST Logistik
            </span>
            
          </div>
          <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" className="text-white hover:bg-green-600" onClick={() => navigate("/")}>Beranda</Button>
            <Button variant="ghost" className="text-white hover:bg-green-600 bg-green-600" onClick={() => navigate("/domestik")}>Domestik</Button>
            
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[560px] flex items-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80')",
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/80 via-green-800/60 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-xl">
            <Badge className="mb-4 bg-green-500 text-white text-sm px-3 py-1">
              ✈ Pengiriman Domestik
            </Badge>
            <h1 className="text-5xl font-extrabold text-white leading-tight mb-4">
              Kirim ke Seluruh
              <br />
              <span className="text-green-300">Penjuru Indonesia</span>
            </h1>
            <p className="text-green-100 text-lg mb-8">
              Layanan pengiriman barang domestik yang cepat, aman, dan terpercaya.
              Dari Sabang sampai Merauke, kami siap melayani.
            </p>


          </div>
        </div>

        {/* Floating stats */}
        <div className="absolute bottom-6 right-6 hidden md:flex gap-4">
          {[
            { label: "Kota Tujuan", value: "200+" },
            { label: "Pengiriman/Bulan", value: "50K+" },
            { label: "Kepuasan", value: "98%" },
          ].map((s) => (
            <div key={s.label} className="bg-white/90 backdrop-blur-sm rounded-xl px-5 py-3 text-center shadow">
              <div className="text-2xl font-bold text-green-700">{s.value}</div>
              <div className="text-xs text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cek Tarif Section */}
      <section className="py-10 bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Cek Tarif Pengiriman</h2>
          <p className="text-center text-gray-500 text-sm mb-6">Minimum berat pengiriman 10 kg</p>
          <div className="bg-gray-50 rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-end">
            {/* Kota Asal */}
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Asal</label>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-1">
                <MapPin className="h-4 w-4 text-green-600 shrink-0" />
                <Select value={origin} onValueChange={setOrigin} disabled={loadingData}>
                  <SelectTrigger className="border-0 p-0 focus:ring-0 shadow-none h-9 text-gray-800 bg-transparent">
                    <SelectValue placeholder={loadingData ? "Memuat..." : "Pilih kota asal"} />
                  </SelectTrigger>
                  <SelectContent>
                    {kotaAsalList.map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Kota Tujuan */}
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Tujuan</label>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-1">
                <MapPin className="h-4 w-4 text-orange-500 shrink-0" />
                <Select value={destination} onValueChange={setDestination} disabled={loadingData}>
                  <SelectTrigger className="border-0 p-0 focus:ring-0 shadow-none h-9 text-gray-800 bg-transparent">
                    <SelectValue placeholder={loadingData ? "Memuat..." : "Pilih kota tujuan"} />
                  </SelectTrigger>
                  <SelectContent>
                    {kotaTujuanList.map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Berat */}
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Berat (kg)</label>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2">
                <Package className="h-4 w-4 text-blue-500 shrink-0" />
                <Input
                  type="number"
                  min="1"
                  placeholder="Contoh: 5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="border-0 p-0 focus-visible:ring-0 text-gray-800 bg-transparent"
                />
              </div>
            </div>

            <Button
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-5 rounded-xl text-base font-semibold"
              onClick={handleCekTarif}
              disabled={loadingCek}
            >
              {loadingCek ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Cek Tarif
            </Button>
          </div>

          {/* Error */}
          {tarifError && (
            <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {tarifError}
            </div>
          )}

          {/* Result */}
          {tarifResult && (
            <div className="mt-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Rute Pengiriman</div>
                  <div className="font-bold text-gray-900 text-lg">
                    {tarifResult.kota_asal} <ArrowRight className="inline h-4 w-4 text-green-600" /> {tarifResult.kota_tujuan}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>
                      Berat input: <strong>{tarifResult.berat_aktual} kg</strong>
                    </span>
                    {tarifResult.berat_aktual < 10 && (
                      <span className="text-orange-600 font-medium">
                        → Dihitung minimal: <strong>10 kg</strong>
                      </span>
                    )}
                    <span>
                      Tarif: <strong>{formatRupiah(tarifResult.harga_per_kg)}/kg</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Estimasi Total</div>
                  {/* Breakdown */}
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5 text-right">
                    <div className="flex justify-end gap-6">
                      <span>Subtotal ({tarifResult.berat_dihitung} kg × {formatRupiah(tarifResult.harga_per_kg)})</span>
                      <span className="font-medium text-gray-700">{formatRupiah(tarifResult.total_harga)}</span>
                    </div>
                    <div className="flex justify-end gap-6">
                      <span>Biaya Admin</span>
                      <span className="font-medium text-gray-700">Rp 20.000</span>
                    </div>
                    <div className="flex justify-end gap-6">
                      <span>PPN 1,1%</span>
                      <span className="font-medium text-gray-700">{formatRupiah(Math.round((tarifResult.total_harga + 20000) * 0.011))}</span>
                    </div>
                  </div>
                  <div className="border-t border-green-200 mt-2 pt-2">
                    <div className="text-3xl font-extrabold text-green-700">
                      {formatRupiah(Math.round((tarifResult.total_harga + 20000) * 1.011))}
                    </div>
                    <div className="text-xs text-green-600 font-medium mt-0.5">Sudah berikut PPN 1,1%</div>
                    <div className="text-xs text-green-600 mt-0.5">Harga sudah termasuk RA, WH dan Handling</div>
                  </div>
                </div>
              </div>
              {/* Disclaimer */}
              <div className="mt-4 pt-3 border-t border-green-200 flex items-start gap-2 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Harga dapat berubah sewaktu-waktu. Belum termasuk biaya packing, asuransi dan penarikan.</span>
              </div>
              {/* CTA Pesan Sekarang */}
              <div className="mt-4 flex justify-end">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-5 rounded-xl text-base font-semibold gap-2 shadow-md"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowAuthModal(true);
                      return;
                    }
                    setShowOrderForm(true);
                  }}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Pesan Sekarang
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Order Form Modal */}
      {tarifResult && showOrderForm && (
        <DomestikOrderForm
          open={showOrderForm}
          onClose={() => setShowOrderForm(false)}
          tarifResult={tarifResult}
        />
      )}

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Layanan Kami</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Berbagai pilihan layanan pengiriman domestik untuk memenuhi setiap kebutuhan bisnis dan personal Anda.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc) => (
              <Card
                key={svc.title}
                className="hover:shadow-lg transition-shadow cursor-pointer border-0 shadow-sm"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-gray-100">{svc.icon}</div>
                    <Badge variant="secondary" className="text-xs">{svc.badge}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">{svc.title}</h3>
                  <p className="text-gray-500 text-sm mb-3">{svc.desc}</p>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    {svc.time}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* Why Choose Us */}
      <section className="py-16 bg-green-700 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Mengapa Memilih Kami?</h2>
            <p className="text-green-200 max-w-xl mx-auto">
              Kami hadir dengan solusi pengiriman terbaik untuk mendukung kelancaran bisnis Anda.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Pengiriman Tepat Waktu", desc: "Komitmen kami memastikan barang tiba sesuai jadwal yang dijanjikan.", icon: <Clock className="h-8 w-8" /> },
              { title: "Jaminan Keamanan", desc: "Asuransi pengiriman dan penanganan profesional untuk setiap paket.", icon: <Shield className="h-8 w-8" /> },
              { title: "Harga Transparan", desc: "Tarif kompetitif tanpa biaya tersembunyi, cek harga real-time.", icon: <CheckCircle className="h-8 w-8" /> },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 items-start">
                <div className="p-3 bg-green-600 rounded-xl shrink-0">{f.icon}</div>
                <div>
                  <h3 className="font-semibold text-xl mb-1">{f.title}</h3>
                  <p className="text-green-200 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Testimoni Pelanggan</h2>
            <p className="text-gray-500">Apa kata mereka tentang layanan kami</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 italic mb-4">"{t.text}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Siap Kirim Sekarang?</h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            Hubungi tim kami dan dapatkan penawaran terbaik untuk kebutuhan pengiriman domestik Anda.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-6 rounded-xl text-base"
              onClick={() => setShowWaModal(true)}
            >
              <Phone className="h-5 w-5 mr-2" />
              Hubungi Kami
            </Button>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-600" />
              +62 822 9999 7227 <br/>
              +62 878 8456 3133 <br/>
              +62 895 2512 6911
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-600" />
              info@travelin.co.id
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg"></span>
            <span className="text-gray-500">Jasa Pengiriman Domestik</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Cahaya Sejati Teknologi. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Silakan login atau daftar terlebih dahulu untuk membuat pesanan kargo domestik."
      />

      {/* WhatsApp Modal */}
      {showWaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowWaModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowWaModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Tutup modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-green-100 p-2 rounded-full">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Pilih Nomor WhatsApp
              </h3>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              Pilih salah satu nomor di bawah untuk menghubungi tim kami via
              WhatsApp.
            </p>

            {/* Number list */}
            <div className="flex flex-col gap-3">
              {waNumbers.map((item) => (
                <a
                  key={item.url}
                  href={`${item.url}?text=${waMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowWaModal(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all group"
                >
                  <div className="bg-green-600 rounded-full p-1.5 flex-shrink-0">
                    <svg
                      className="h-4 w-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <span className="text-green-700 font-medium group-hover:text-green-800">
                    {item.label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomestikPage;
