import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  Plane,
  Navigation,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const HandlingPage = () => {
  const navigate = useNavigate();
  const { addToCart } = useShoppingCart();
  const { toast } = useToast();
  const { userName, userEmail, userPhone } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    passengerArea: "",
    serviceLocation: "",
    category: "",
    pickDate: new Date(),
    pickTime: "09:00",
    passengers: 4, // Only used for Group categories
    flightNumber: "",
    travelType: "Arrival",
    pickupArea: "",
    additionalNotes: "",
  });

  // Auto-fill form with user data when available
  useEffect(() => {
    if (userName || userEmail || userPhone) {
      setFormData((prev) => ({
        ...prev,
        name: userName || prev.name,
        email: userEmail || prev.email,
        phone: userPhone || prev.phone,
      }));
      console.log("[HandlingPage] Auto-filled form with user data:", {
        display_name: userName,
        email: userEmail,
        phone: userPhone,
      });
    }
  }, [userName, userEmail, userPhone]);

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 = category selection, 2 = form, 3 = summary
  const [servicePrice, setServicePrice] = useState(0);
  const [categoryPrice, setCategoryPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  // Dynamic location options based on category
  const locationOptions = {
    "International - Individual": {
      passengerAreas: [
        "Terminal 2F – International Arrival Hall",
        "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
        "Terminal 2F – International Departure Check-in",
        "Terminal 3 – International Departure (Check-in & Imigrasi)",
        "Terminal 2F – International Transfer Desk",
        "Terminal 3 – International Transfer Area",
      ],
      pickupAreas: [
        "Terminal 2F – International Arrival Hall",
        "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
        "Terminal 2F – International Departure Check-in",
        "Terminal 3 – International Departure (Check-in & Imigrasi)",
        "Terminal 2F – International Transfer Desk",
        "Terminal 3 – International Transfer Area",
      ],
    },
    "Domestik - Individual": {
      passengerAreas: [
        "Terminal 2D – Domestik Arrival Hall",
        "Terminal 2E – Domestik Arrival Hall",
        "Terminal 3 – Domestik Arrival Hall",
        "Terminal 2D – Domestik Departure Check-in",
        "Terminal 2E – Domestik Departure Check-in",
        "Terminal 3 – Domestik Departure Area",
      ],
      pickupAreas: [
        "Terminal 2D – Domestik Arrival Hall",
        "Terminal 2E – Domestik Arrival Hall",
        "Terminal 3 – Domestik Arrival Hall",
        "Terminal 2D – Domestik Departure Check-in",
        "Terminal 2E – Domestik Departure Check-in",
        "Terminal 3 – Domestik Departure Area",
      ],
    },
    "International - Group": {
      passengerAreas: [
        "Terminal 2F – International Arrival Hall",
        "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
        "Terminal 2F – International Departure Check-in",
        "Terminal 3 – International Departure (Check-in & Imigrasi)",
        "Terminal 2F – International Transfer Desk",
        "Terminal 3 – International Transfer Area",
      ],
      pickupAreas: [
        "Terminal 2F – International Arrival Hall",
        "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
        "Terminal 2F – International Departure Check-in",
        "Terminal 3 – International Departure (Check-in & Imigrasi)",
        "Terminal 2F – International Transfer Desk",
        "Terminal 3 – International Transfer Area",
      ],
    },
    "Domestik - Group": {
      passengerAreas: [
        "Terminal 2D – Domestik Arrival Hall",
        "Terminal 2E – Domestik Arrival Hall",
        "Terminal 3 – Domestik Arrival Hall",
        "Terminal 2D – Domestik Departure Check-in",
        "Terminal 2E – Domestik Departure Check-in",
        "Terminal 3 – Domestik Departure Area",
      ],
      pickupAreas: [
        "Terminal 2D – Domestik Arrival Hall",
        "Terminal 2E – Domestik Arrival Hall",
        "Terminal 3 – Domestik Arrival Hall",
        "Terminal 2D – Domestik Departure Check-in",
        "Terminal 2E – Domestik Departure Check-in",
        "Terminal 3 – Domestik Departure Area",
      ],
    },
  };

  // Get current options based on selected category
  const getCurrentOptions = () => {
    if (!formData.category) {
      return { passengerAreas: [], pickupAreas: [] };
    }
    return (
      locationOptions[formData.category as keyof typeof locationOptions] || {
        passengerAreas: [],
        pickupAreas: [],
      }
    );
  };

  const currentOptions = getCurrentOptions();

  const travelTypes = [
    { value: "Arrival", label: "Arrival" },
    { value: "Departure", label: "Departure" },
    { value: "Transit", label: "Transit" },
  ];

  const categories = [
    "International - Individual",
    "Domestik - Individual",
    "International - Group",
    "Domestik - Group",
  ];

  const timeSlots = [
    "06:00",
    "06:30",
    "07:00",
    "07:30",
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
  ];

  const handleInputChange = (field: string, value: string | Date | number) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value,
      };

      // Reset location fields when category changes
      if (field === "category") {
        newData.passengerArea = "";
        newData.pickupArea = "";
      }

      return newData;
    });

    // Fetch prices when category changes
    if (field === "category") {
      fetchPrices(value as string);
    }
  };

  const fetchPrices = async (category: string) => {
    try {
      if (category) {
        // Map category to ID based on your requirements
        let categoryId;
        switch (category) {
          case "International - Individual":
            categoryId = 1;
            break;
          case "Domestik - Individual":
            categoryId = 2;
            break;
          case "International - Group":
            categoryId = 3;
            break;
          case "Domestik - Group":
            categoryId = 4;
            break;
          default:
            categoryId = null;
        }

        if (categoryId) {
          const { data: categoryData, error: categoryError } = await supabase
            .from("airport_handling_services")
            .select("sell_price, additional")
            .eq("id", categoryId);

          if (categoryError) {
            console.error("Error fetching category price:", categoryError);
          } else {
            // Handle array result - take first item if exists
            const firstResult =
              categoryData && categoryData.length > 0 ? categoryData[0] : null;
            setServicePrice(firstResult?.sell_price || 0);
            setCategoryPrice(firstResult?.additional || 0);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  // Calculate total price whenever service price, category price, or passengers change
  useEffect(() => {
    if (formData.category.includes("Group")) {
      // For group bookings: sell_price + (additional * passengers)
      const totalGroupPrice =
        servicePrice + categoryPrice * formData.passengers;
      setTotalPrice(totalGroupPrice);
    } else {
      // For individual bookings: just the sell_price
      setTotalPrice(servicePrice);
    }
  }, [servicePrice, categoryPrice, formData.passengers, formData.category]);

  const handleBookNow = async () => {
    setIsLoading(true);

    try {
      // Add to shopping cart
      await addToCart({
        item_type: "handling",
        service_name: `Handling Service - ${formData.passengerArea}`,
        price: totalPrice || 150000, // Use calculated total price or fallback
        quantity: 1,
        details: {
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          passengerArea: formData.passengerArea,
          category: formData.category,
          // Only include passengers for Group categories
          ...(formData.category.includes("Group") && {
            passengers: formData.passengers,
          }),
          pickupDate: format(formData.pickDate, "yyyy-MM-dd"),
          pickupTime: formData.pickTime,
          flightNumber: formData.flightNumber,
          travelType: formData.travelType,
          pickupArea: formData.pickupArea,
          additionalNotes: formData.additionalNotes,
          serviceType: "handling",
          servicePrice: servicePrice,
          categoryPrice: categoryPrice,
          totalPrice: totalPrice,
        },
      });

      toast({
        title: "Berhasil ditambahkan",
        description: "Layanan handling telah ditambahkan ke keranjang belanja.",
      });

      // Navigate to cart or back to travel page
      navigate("/cart");
    } catch (error) {
      console.error("Error adding handling service to cart:", error);
      toast({
        title: "Gagal menambahkan",
        description: "Terjadi kesalahan saat menambahkan layanan ke keranjang.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      navigate("/");
    }
  };

  const handleContinueToForm = () => {
    if (!formData.category) {
      toast({
        title: "Pilih kategori",
        description: "Mohon pilih kategori layanan terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(2);
  };

  const handleContinueToSummary = () => {
    // Validate form
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.passengerArea ||
      !formData.category ||
      !formData.flightNumber ||
      !formData.pickupArea
    ) {
      toast({
        title: "Form tidak lengkap",
        description: "Mohon lengkapi semua field yang diperlukan.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(3);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 p-0 h-auto text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Halaman Utama
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Layanan Handling Bandara
          </h1>
          <p className="text-gray-600">
            Pesan layanan handling untuk memudahkan perjalanan Anda di bandara
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-4">
            <div
              className={`flex items-center space-x-2 ${currentStep >= 1 ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                1
              </div>
              <span className="text-sm font-medium">Pilih Kategori</span>
            </div>
            <div
              className={`w-8 h-0.5 ${currentStep >= 2 ? "bg-green-600" : "bg-gray-200"}`}
            ></div>
            <div
              className={`flex items-center space-x-2 ${currentStep >= 2 ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                2
              </div>
              <span className="text-sm font-medium">Informasi Pemesanan</span>
            </div>
            <div
              className={`w-8 h-0.5 ${currentStep >= 3 ? "bg-green-600" : "bg-gray-200"}`}
            ></div>
            <div
              className={`flex items-center space-x-2 ${currentStep >= 3 ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 3
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                3
              </div>
              <span className="text-sm font-medium">Ringkasan Pesanan</span>
            </div>
          </div>
        </div>

        {/* Category Selection Card */}
        {currentStep === 1 && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Pilih Kategori Layanan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category) => (
                  <div
                    key={category}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.category === category
                        ? "border-green-600 bg-green-50"
                        : "border-gray-200 hover:border-green-300"
                    }`}
                    onClick={() => handleInputChange("category", category)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          formData.category === category
                            ? "border-green-600 bg-green-600"
                            : "border-gray-300"
                        }`}
                      >
                        {formData.category === category && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {category}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {category.includes("International")
                            ? "Layanan untuk penerbangan internasional"
                            : "Layanan untuk penerbangan domestik"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Category Display */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <User className="h-4 w-4 mr-2 text-green-600" />
                  Kategori Terpilih
                </label>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="font-medium text-green-800">
                    {formData.category}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Kembali
                </Button>
                <Button
                  onClick={handleContinueToForm}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Lanjutkan ke Form
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Card */}
        {currentStep === 2 && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Informasi Pemesanan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <User className="h-4 w-4 mr-2 text-green-600" />
                  Nama Lengkap
                </label>
                <Input
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4 mr-2 text-green-600" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Masukkan alamat email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Phone className="h-4 w-4 mr-2 text-green-600" />
                  No. Telepon
                </label>
                <Input
                  type="tel"
                  placeholder="Masukkan nomor telepon"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Passenger Area Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <MapPin className="h-4 w-4 mr-2 text-green-600" />
                  Area Lokasi Penumpang
                </label>
                <Select
                  value={formData.passengerArea}
                  onValueChange={(value) =>
                    handleInputChange("passengerArea", value)
                  }
                  disabled={!formData.category}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        formData.category
                          ? "Pilih area lokasi penumpang"
                          : "Pilih kategori terlebih dahulu"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {currentOptions.passengerAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Flight Number Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Plane className="h-4 w-4 mr-2 text-green-600" />
                  Nomor Penerbangan
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: GA123, SJ182"
                  value={formData.flightNumber}
                  onChange={(e) =>
                    handleInputChange("flightNumber", e.target.value)
                  }
                  className="w-full"
                />
              </div>

              {/* Travel Type Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Navigation className="h-4 w-4 mr-2 text-green-600" />
                  Jenis Perjalanan
                </label>
                <RadioGroup
                  value={formData.travelType}
                  onValueChange={(value) =>
                    handleInputChange("travelType", value)
                  }
                  className="flex flex-col space-y-2"
                >
                  {travelTypes.map((type) => (
                    <div
                      key={type.value}
                      className="flex items-center space-x-2"
                    >
                      <RadioGroupItem value={type.value} id={type.value} />
                      <label
                        htmlFor={type.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Pickup Area Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <MapPin className="h-4 w-4 mr-2 text-green-600" />
                  Area Lokasi Jemput
                </label>
                <Select
                  value={formData.pickupArea}
                  onValueChange={(value) =>
                    handleInputChange("pickupArea", value)
                  }
                  disabled={!formData.category}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        formData.category
                          ? "Pilih area lokasi jemput"
                          : "Pilih kategori terlebih dahulu"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {currentOptions.pickupAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Notes Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <FileText className="h-4 w-4 mr-2 text-green-600" />
                  Catatan Lokasi Tambahan
                </label>
                <Textarea
                  placeholder="Masukkan catatan tambahan mengenai lokasi jemput (opsional)"
                  value={formData.additionalNotes}
                  onChange={(e) =>
                    handleInputChange("additionalNotes", e.target.value)
                  }
                  className="w-full min-h-[80px]"
                />
              </div>

              {/* Date and Time Fields for Individual categories */}
              {(formData.category === "International - Individual" ||
                formData.category === "Domestik - Individual") && (
                <>
                  {/* Pickup Date Field */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <CalendarIcon className="h-4 w-4 mr-2 text-green-600" />
                      Tanggal Pickup
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.pickDate ? (
                            format(formData.pickDate, "PPP")
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.pickDate}
                          onSelect={(date) =>
                            date && handleInputChange("pickDate", date)
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Pickup Time Field */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Clock className="h-4 w-4 mr-2 text-green-600" />
                      Waktu Pickup
                    </label>
                    <Select
                      value={formData.pickTime}
                      onValueChange={(value) =>
                        handleInputChange("pickTime", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih waktu pickup" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Passenger Field - Only show for Group categories */}
              {(formData.category === "International - Group" ||
                formData.category === "Domestik - Group") && (
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <User className="h-4 w-4 mr-2 text-green-600" />
                    Jumlah Penumpang
                  </label>
                  <Select
                    value={formData.passengers.toString()}
                    onValueChange={(value) =>
                      handleInputChange("passengers", parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih jumlah penumpang" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 7 }, (_, i) => i + 4).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} Penumpang
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Minimum 4 penumpang. Biaya tambahan: Rp{" "}
                    {categoryPrice.toLocaleString()} per penumpang
                  </p>
                </div>
              )}

              {/* Date and Time Fields for Group categories */}
              {(formData.category === "International - Group" ||
                formData.category === "Domestik - Group") && (
                <>
                  {/* Pickup Date Field */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <CalendarIcon className="h-4 w-4 mr-2 text-green-600" />
                      Tanggal Pickup
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.pickDate ? (
                            format(formData.pickDate, "PPP")
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.pickDate}
                          onSelect={(date) =>
                            date && handleInputChange("pickDate", date)
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Pickup Time Field */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Clock className="h-4 w-4 mr-2 text-green-600" />
                      Waktu Pickup
                    </label>
                    <Select
                      value={formData.pickTime}
                      onValueChange={(value) =>
                        handleInputChange("pickTime", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih waktu pickup" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Kembali
                </Button>
                <Button
                  onClick={handleContinueToSummary}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Lanjutkan ke Ringkasan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {currentStep === 3 && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Ringkasan Pesanan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Detail Layanan
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Layanan:</span>
                    <span className="font-medium">Handling Service</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Area Lokasi Penumpang:
                    </span>
                    <span className="font-medium">
                      {formData.passengerArea}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kategori:</span>
                    <span className="font-medium">{formData.category}</span>
                  </div>
                  {(formData.category === "International - Group" ||
                    formData.category === "Domestik - Group") && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Jumlah Penumpang:</span>
                      <span className="font-medium">
                        {formData.passengers} Penumpang
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tanggal:</span>
                    <span className="font-medium">
                      {format(formData.pickDate, "dd MMMM yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Waktu:</span>
                    <span className="font-medium">{formData.pickTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nomor Penerbangan:</span>
                    <span className="font-medium">{formData.flightNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jenis Perjalanan:</span>
                    <span className="font-medium">{formData.travelType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Area Lokasi Jemput:</span>
                    <span className="font-medium">{formData.pickupArea}</span>
                  </div>
                  {formData.additionalNotes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Catatan Tambahan:</span>
                      <span className="font-medium">
                        {formData.additionalNotes}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Detail Pelanggan
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama:</span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telepon:</span>
                    <span className="font-medium">{formData.phone}</span>
                  </div>
                </div>
              </div>

              {/* Price Details */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3">
                  Detail Harga
                </h3>
                <div className="space-y-2 text-sm">
                  {servicePrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-700">
                        Harga Dasar ({formData.category}):
                      </span>
                      <span className="font-medium text-green-800">
                        Rp {servicePrice.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {formData.category.includes("Group") && categoryPrice > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Biaya per Penumpang:
                        </span>
                        <span className="font-medium text-green-800">
                          Rp {categoryPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Jumlah Penumpang:
                        </span>
                        <span className="font-medium text-green-800">
                          {formData.passengers} orang
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Subtotal Penumpang:
                        </span>
                        <span className="font-medium text-green-800">
                          Rp{" "}
                          {(
                            categoryPrice * formData.passengers
                          ).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  {totalPrice === 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Layanan Handling:</span>
                      <span className="font-medium text-green-800">
                        Rp 150.000
                      </span>
                    </div>
                  )}
                  <div className="border-t border-green-200 pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-green-800">
                      <span>Total:</span>
                      <span>Rp {(totalPrice || 150000).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Kembali ke Form
                </Button>
                <Button
                  onClick={handleBookNow}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? "Memproses..." : "Book Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Info */}
        <Card className="mt-6 bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-green-800 mb-2">
              Tentang Layanan Handling
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Bantuan check-in dan boarding pass</li>
              <li>• Pendampingan di area keberangkatan</li>
              <li>• Bantuan bagasi dan dokumen perjalanan</li>
              <li>• Layanan prioritas di counter bandara</li>
              <li>• Harga bervariasi berdasarkan lokasi dan kategori</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HandlingPage;
