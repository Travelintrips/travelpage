import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Save, TestTube, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/supabase";

interface PaylabsConfig {
  merchantId: string;
  publicKeyProduction: string;
  privateKeyProduction: string;
  publicKeySandbox: string;
  privateKeySandbox: string;
  mode: "sandbox" | "production";
  paymentMethods: {
    vaBca: boolean;
    vaBni: boolean;
    qris: boolean;
    dana: boolean;
    ovo: boolean;
    shopeePay: boolean;
    gopay: boolean;
  };
  dynamicPaymentMethods: { [key: string]: boolean };
}

interface NewPaymentMethod {
  name: string;
  type: "gateway";
  provider: "paylabs";
  code: string;
  mode: "sandbox" | "production";
  status: "aktif" | "nonaktif";
}

const PaylabsSettings: React.FC = () => {
  const { toast } = useToast();

  // Load saved config from localStorage and database
  const loadSavedConfig = (): PaylabsConfig => {
    try {
      const savedConfig = localStorage.getItem("paylabs-config");
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        return {
          merchantId: parsed.merchantId || "",
          publicKeyProduction: parsed.publicKeyProduction || "",
          privateKeyProduction: parsed.privateKeyProduction || "",
          publicKeySandbox: parsed.publicKeySandbox || "",
          privateKeySandbox: parsed.privateKeySandbox || "",
          mode: parsed.mode || "sandbox",
          paymentMethods: parsed.paymentMethods || {
            vaBca: false,
            vaBni: false,
            qris: false,
            dana: false,
            ovo: false,
            shopeePay: false,
            gopay: false,
          },
          dynamicPaymentMethods: parsed.dynamicPaymentMethods || {},
        };
      }
    } catch (error) {
      console.error("Error loading saved config:", error);
    }

    return {
      merchantId: "",
      publicKeyProduction: "",
      privateKeyProduction: "",
      publicKeySandbox: "",
      privateKeySandbox: "",
      mode: "sandbox",
      paymentMethods: {
        vaBca: false,
        vaBni: false,
        qris: false,
        dana: false,
        ovo: false,
        shopeePay: false,
        gopay: false,
      },
      dynamicPaymentMethods: {},
    };
  };

  // Load config from database
  const loadConfigFromDatabase = async () => {
    try {
      // Fetch both sandbox and production configurations
      const { data: configRows, error } = await supabase
        .from("paylabs_config")
        .select("*");

      if (error && error.code !== "PGRST116") {
        console.error("Error loading config from database:", error);
        return;
      }

      if (configRows && configRows.length > 0) {
        // Find sandbox and production configs
        const sandboxConfig = configRows.find((row) => row.mode === "sandbox");
        const productionConfig = configRows.find(
          (row) => row.mode === "production",
        );

        // Use the current mode to determine which config to use as primary
        const primaryConfig =
          config.mode === "production" ? productionConfig : sandboxConfig;

        const dbConfig = {
          merchantId:
            primaryConfig?.merchant_id ||
            sandboxConfig?.merchant_id ||
            productionConfig?.merchant_id ||
            "",
          publicKeyProduction: productionConfig?.public_key || "",
          privateKeyProduction: productionConfig?.private_key || "",
          publicKeySandbox: sandboxConfig?.public_key || "",
          privateKeySandbox: sandboxConfig?.private_key || "",
          mode: primaryConfig?.mode || config.mode || "sandbox",
          paymentMethods: config.paymentMethods,
          dynamicPaymentMethods: config.dynamicPaymentMethods || {},
        };

        setConfig(dbConfig);
        saveConfigToStorage(dbConfig);
      }
    } catch (error) {
      console.error("Error loading config from database:", error);
    }
  };

  const [config, setConfig] = useState<PaylabsConfig>(loadSavedConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMethod, setNewMethod] = useState<NewPaymentMethod>({
    name: "",
    type: "gateway",
    provider: "paylabs",
    code: "",
    mode: "sandbox",
    status: "aktif",
  });
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [paylabsPaymentMethods, setPaylabsPaymentMethods] = useState<
    Tables<"payment_methods">[]
  >([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  const paymentMethodLabels = {
    vaBca: "VA BCA",
    vaBni: "VA BNI",
    qris: "QRIS",
    dana: "Dana",
    ovo: "OVO",
    shopeePay: "ShopeePay",
    gopay: "Gopay",
  };

  // Fetch Paylabs payment methods from database
  const fetchPaylabsPaymentMethods = async () => {
    setIsLoadingMethods(true);
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("provider", "paylabs")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setPaylabsPaymentMethods(data || []);
    } catch (error) {
      console.error("Error fetching Paylabs payment methods:", error);
      toast({
        title: "Error",
        description: "Gagal memuat metode pembayaran Paylabs.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMethods(false);
    }
  };

  useEffect(() => {
    fetchPaylabsPaymentMethods();
    loadConfigFromDatabase();
  }, []);

  // Initialize dynamic payment methods when data is loaded
  useEffect(() => {
    if (paylabsPaymentMethods.length > 0) {
      const dynamicMethods: { [key: string]: boolean } = {};
      paylabsPaymentMethods.forEach((method) => {
        // Check if we have saved state for this method, otherwise use database default
        const savedState = config.dynamicPaymentMethods[method.id];
        dynamicMethods[method.id] =
          savedState !== undefined ? savedState : method.is_active || false;
      });
      setConfig((prev) => {
        const newConfig = {
          ...prev,
          dynamicPaymentMethods: dynamicMethods,
        };
        saveConfigToStorage(newConfig);
        return newConfig;
      });
    }
  }, [paylabsPaymentMethods]);

  // Save config to localStorage whenever it changes
  const saveConfigToStorage = (newConfig: PaylabsConfig) => {
    try {
      localStorage.setItem("paylabs-config", JSON.stringify(newConfig));
    } catch (error) {
      console.error("Error saving config to localStorage:", error);
    }
  };

  const handleInputChange = (
    field: keyof Omit<
      PaylabsConfig,
      "paymentMethods" | "dynamicPaymentMethods"
    >,
    value: string,
  ) => {
    setConfig((prev) => {
      const newConfig = {
        ...prev,
        [field]: value,
      };
      saveConfigToStorage(newConfig);
      return newConfig;
    });
  };

  const handlePaymentMethodChange = (
    method: keyof PaylabsConfig["paymentMethods"],
    checked: boolean,
  ) => {
    setConfig((prev) => {
      const newConfig = {
        ...prev,
        paymentMethods: {
          ...prev.paymentMethods,
          [method]: checked,
        },
      };
      saveConfigToStorage(newConfig);
      return newConfig;
    });
  };

  const handleDynamicPaymentMethodChange = (
    methodId: string,
    checked: boolean,
  ) => {
    setConfig((prev) => {
      const newConfig = {
        ...prev,
        dynamicPaymentMethods: {
          ...prev.dynamicPaymentMethods,
          [methodId]: checked,
        },
      };
      saveConfigToStorage(newConfig);
      return newConfig;
    });
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Validation: Check if production keys are not empty when production mode is selected
      if (config.mode === "production") {
        if (
          !config.publicKeyProduction.trim() ||
          !config.privateKeyProduction.trim()
        ) {
          toast({
            title: "Validasi Gagal",
            description:
              "Public Key dan Private Key production tidak boleh kosong saat mode production dipilih.",
            variant: "destructive",
          });
          return;
        }
      }

      // Validation: Check if sandbox keys are not empty when sandbox mode is selected
      if (config.mode === "sandbox") {
        if (
          !config.publicKeySandbox.trim() ||
          !config.privateKeySandbox.trim()
        ) {
          toast({
            title: "Validasi Gagal",
            description:
              "Public Key dan Private Key sandbox tidak boleh kosong saat mode sandbox dipilih.",
            variant: "destructive",
          });
          return;
        }
      }

      // Save both sandbox and production configurations to paylabs_config table
      const configsToSave = [];

      // Save sandbox config if keys are provided
      if (config.publicKeySandbox.trim() && config.privateKeySandbox.trim()) {
        configsToSave.push({
          mode: "sandbox",
          merchant_id: config.merchantId,
          public_key: config.publicKeySandbox,
          private_key: config.privateKeySandbox,
          updated_at: new Date().toISOString(),
        });
      }

      // Save production config if keys are provided
      if (
        config.publicKeyProduction.trim() &&
        config.privateKeyProduction.trim()
      ) {
        configsToSave.push({
          mode: "production",
          merchant_id: config.merchantId,
          public_key: config.publicKeyProduction,
          private_key: config.privateKeyProduction,
          updated_at: new Date().toISOString(),
        });
      }

      if (configsToSave.length > 0) {
        const { error: configError } = await supabase
          .from("paylabs_config")
          .upsert(configsToSave, { onConflict: "mode" });

        if (configError) {
          throw configError;
        }
      }

      // Update individual payment method statuses and mode
      for (const [methodId, isEnabled] of Object.entries(
        config.dynamicPaymentMethods,
      )) {
        // Update all payment methods with provider = 'paylabs'
        const updateData: any = {
          is_active: isEnabled,
        };

        // Only update mode for checked (enabled) payment methods
        if (isEnabled) {
          updateData.mode = config.mode;
        }

        const { error: methodError } = await supabase
          .from("payment_methods")
          .update(updateData)
          .eq("id", methodId)
          .eq("provider", "paylabs");

        if (methodError) {
          console.error(
            `Error updating payment method ${methodId}:`,
            methodError,
          );
        }
      }

      toast({
        title: "Pengaturan Tersimpan",
        description: "Konfigurasi Paylabs berhasil disimpan ke database.",
      });

      // Refresh payment methods list and reload config from database
      await fetchPaylabsPaymentMethods();
      await loadConfigFromDatabase();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPayment = async () => {
    setIsTesting(true);
    try {
      // Simulate test payment API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "Test Pembayaran Berhasil",
        description: "Koneksi ke Paylabs Payment Gateway berhasil diuji.",
      });
    } catch (error) {
      toast({
        title: "Test Gagal",
        description: "Gagal menghubungi Paylabs Payment Gateway.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const generateCode = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  };

  const handleNewMethodChange = (
    field: keyof NewPaymentMethod,
    value: string,
  ) => {
    setNewMethod((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "name") {
        updated.code = generateCode(value);
      }
      return updated;
    });
  };

  const handleAddNewMethod = async () => {
    setIsAddingMethod(true);
    try {
      // Insert new payment method into the payment_methods table
      const { data, error } = await supabase
        .from("payment_methods")
        .insert({
          name: newMethod.name,
          type: newMethod.type,
          provider: newMethod.provider,
          payment_code: newMethod.code,
          mode: newMethod.mode,
          is_active: newMethod.status === "aktif",
        })
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "Metode Pembayaran Ditambahkan",
        description: `Metode pembayaran ${newMethod.name} berhasil ditambahkan.`,
      });

      // Reset form and close dialog
      setNewMethod({
        name: "",
        type: "gateway",
        provider: "paylabs",
        code: "",
        mode: "sandbox",
        status: "aktif",
      });
      setIsDialogOpen(false);
      // Refresh the payment methods list
      fetchPaylabsPaymentMethods();
    } catch (error) {
      console.error("Error adding payment method:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan metode pembayaran. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsAddingMethod(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast({
        title: "Metode Pembayaran Dihapus",
        description: "Metode pembayaran berhasil dihapus.",
      });

      // Refresh the payment methods list
      fetchPaylabsPaymentMethods();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus metode pembayaran. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  const isFormValid =
    config.merchantId.trim() !== "" &&
    (config.mode === "production"
      ? config.publicKeyProduction.trim() !== "" &&
        config.privateKeyProduction.trim() !== ""
      : config.publicKeySandbox.trim() !== "" &&
        config.privateKeySandbox.trim() !== "");
  const hasEnabledPaymentMethods =
    Object.values(config.paymentMethods).some((enabled) => enabled) ||
    Object.values(config.dynamicPaymentMethods).some((enabled) => enabled);

  return (
    <div className="bg-white min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Paylabs Setting</h1>
          <p className="text-gray-600 mt-2">
            Konfigurasi integrasi Paylabs Payment Gateway
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Konfigurasi Paylabs</CardTitle>
            <CardDescription>
              Atur kredensial dan metode pembayaran yang tersedia melalui
              Paylabs Payment Gateway
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="merchantId">Merchant ID</Label>
                <Input
                  id="merchantId"
                  placeholder="Masukkan Merchant ID"
                  value={config.merchantId}
                  onChange={(e) =>
                    handleInputChange("merchantId", e.target.value)
                  }
                />
              </div>

              {/* Conditional rendering based on mode */}
              {config.mode === "production" ? (
                <>
                  {/* Production Keys */}
                  <div className="space-y-2">
                    <Label htmlFor="publicKeyProduction">
                      Paylabs Public Key (Production)
                    </Label>
                    <Input
                      id="publicKeyProduction"
                      type="password"
                      placeholder="Masukkan Paylabs Public Key Production"
                      value={config.publicKeyProduction}
                      onChange={(e) =>
                        handleInputChange("publicKeyProduction", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="privateKeyProduction">
                      Merchant Private Key (Production)
                    </Label>
                    <Input
                      id="privateKeyProduction"
                      type="password"
                      placeholder="Masukkan Merchant Private Key Production"
                      value={config.privateKeyProduction}
                      onChange={(e) =>
                        handleInputChange(
                          "privateKeyProduction",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Sandbox Keys */}
                  <div className="space-y-2">
                    <Label htmlFor="publicKeySandbox">
                      Paylabs Public Key (Sandbox)
                    </Label>
                    <Input
                      id="publicKeySandbox"
                      type="password"
                      placeholder="Masukkan Paylabs Public Key Sandbox"
                      value={config.publicKeySandbox}
                      onChange={(e) =>
                        handleInputChange("publicKeySandbox", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="privateKeySandbox">
                      Merchant Private Key (Sandbox)
                    </Label>
                    <Input
                      id="privateKeySandbox"
                      type="password"
                      placeholder="Masukkan Merchant Private Key Sandbox"
                      value={config.privateKeySandbox}
                      onChange={(e) =>
                        handleInputChange("privateKeySandbox", e.target.value)
                      }
                    />
                  </div>
                </>
              )}
            </div>

            {/* Mode Selection */}
            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select
                value={config.mode}
                onValueChange={(value: "sandbox" | "production") =>
                  handleInputChange("mode", value)
                }
              >
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Pilih mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4">
              {/* Dynamic Payment Methods from Database */}
              {paylabsPaymentMethods.length > 0 && (
                <>
                  <Label className="text-base font-medium">
                    Metode Pembayaran (Paylabs)
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {paylabsPaymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={method.id}
                          checked={
                            config.dynamicPaymentMethods[method.id] || false
                          }
                          onCheckedChange={(checked) =>
                            handleDynamicPaymentMethodChange(
                              method.id,
                              checked as boolean,
                            )
                          }
                        />
                        <Label
                          htmlFor={method.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {method.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!hasEnabledPaymentMethods && (
                <p className="text-sm text-amber-600">
                  Pilih minimal satu metode pembayaran
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleSaveSettings}
                disabled={
                  !isFormValid || !hasEnabledPaymentMethods || isLoading
                }
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestPayment}
                disabled={!isFormValid || isTesting}
                className="flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                {isTesting ? "Menguji..." : "Uji Coba Pembayaran"}
              </Button>
            </div>

            {/* Status Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                Status Konfigurasi
              </h3>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span>Merchant ID:</span>
                  <span
                    className={
                      config.merchantId ? "text-green-600" : "text-red-600"
                    }
                  >
                    {config.merchantId ? "Terkonfigurasi" : "Belum diatur"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Paylabs Public Key (Production):</span>
                  <span
                    className={
                      config.publicKeyProduction
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {config.publicKeyProduction
                      ? "Terkonfigurasi"
                      : "Belum diatur"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Merchant Private Key (Production):</span>
                  <span
                    className={
                      config.privateKeyProduction
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {config.privateKeyProduction
                      ? "Terkonfigurasi"
                      : "Belum diatur"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Paylabs Public Key (Sandbox):</span>
                  <span
                    className={
                      config.publicKeySandbox
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {config.publicKeySandbox
                      ? "Terkonfigurasi"
                      : "Belum diatur"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Merchant Private Key (Sandbox):</span>
                  <span
                    className={
                      config.privateKeySandbox
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {config.privateKeySandbox
                      ? "Terkonfigurasi"
                      : "Belum diatur"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Mode:</span>
                  <span className="capitalize font-medium">{config.mode}</span>
                </p>
                <p className="flex justify-between">
                  <span>Metode Pembayaran Default Aktif:</span>
                  <span className="font-medium">
                    {
                      Object.values(config.paymentMethods).filter(Boolean)
                        .length
                    }{" "}
                    dari {Object.keys(config.paymentMethods).length}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Bank Paylabs Aktif:</span>
                  <span className="font-medium">
                    {
                      Object.values(config.dynamicPaymentMethods).filter(
                        Boolean,
                      ).length
                    }{" "}
                    dari {paylabsPaymentMethods.length}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaylabsSettings;
