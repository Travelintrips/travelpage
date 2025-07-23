import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ArrowLeft, UploadCloud, User, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthForm from "@/components/auth/AuthForm";
import { useAuth } from "@/contexts/AuthContext";

const UploadField = ({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="space-y-1">
    <Label className="font-medium">{label}</Label>
    <div className="relative flex items-center">
      <Input type="text" value={file?.name || ""} className="pr-10" readOnly />
      <input
        type="file"
        accept="image/*"
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <UploadCloud className="absolute right-3 h-5 w-5 text-gray-500 pointer-events-none" />
    </div>
    {file && (
      <img
        src={URL.createObjectURL(file)}
        alt={`${label} Preview`}
        className="mt-2 rounded-md max-h-48 border"
      />
    )}
  </div>
);

const SelfieCapture = ({
  selfie,
  setSelfie,
}: {
  selfie: File | null;
  setSelfie: (file: File | null) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setSelfie(file);
        setSelfiePreview(URL.createObjectURL(file));
        stopCamera();
      }
    }, "image/jpeg");
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfie(file);
      setSelfiePreview(URL.createObjectURL(file));
      stopCamera();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="font-medium">Selfie</Label>
      <div className="w-full rounded-md border bg-gray-100 p-4 flex justify-center items-center min-h-[200px]">
        {selfiePreview ? (
          <img
            src={selfiePreview}
            alt="Selfie Preview"
            className="max-h-48 rounded-md"
          />
        ) : isCameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            className="w-full max-w-md h-48 rounded bg-black mx-auto"
          />
        ) : (
          <div className="text-gray-400 text-center">
            <UploadCloud className="mx-auto h-10 w-10" />
            <p className="mt-2">
              Silakan ambil atau upload foto selfie untuk verifikasi
            </p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex gap-2 flex-wrap pt-2">
        <Button onClick={startCamera} type="button">
          📷 Mulai Kamera
        </Button>
        <Button onClick={captureSelfie} type="button">
          📸 Ambil Foto
        </Button>
        <label className="cursor-pointer bg-white border rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
          Upload Foto
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};

const DriverPerusahaanPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Check if user is already authenticated and is a driver
  useEffect(() => {
    if (
      isAuthenticated &&
      (userRole === "Driver Mitra" || userRole === "Driver Perusahaan")
    ) {
      console.log("User is authenticated as a driver, redirecting to profile");
      navigate("/driver-profile");
    } else {
      console.log("User authentication status:", { isAuthenticated, userRole });
    }
  }, [isAuthenticated, userRole, navigate]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    referencePhone: "",
    licenseNumber: "",
    password: "",
  });

  const [licenseExpiry, setLicenseExpiry] = useState<Date | null>(null);
  const [stnkExpiry, setStnkExpiry] = useState<Date | null>(null);
  // File state with validation tracking
  const [selfie, setSelfie] = useState<File | null>(null);
  const [sim, setSim] = useState<File | null>(null);
  const [stnk, setStnk] = useState<File | null>(null);
  const [kk, setKk] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.licenseNumber ||
        !formData.password
      ) {
        alert("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      if (!licenseExpiry) {
        alert("Please select a license expiry date");
        setIsSubmitting(false);
        return;
      }

      if (!selfie || !sim || !stnk) {
        alert("Please upload all required documents (Selfie, SIM, and STNK)");
        setIsSubmitting(false);
        return;
      }

      // Create upload function with better error handling
      const upload = async (file: File | null, folder: string) => {
        if (!file) return null;

        // Use the correct bucket name based on the folder type
        let bucketName = "";
        if (folder === "selfies") bucketName = "selfies";
        else if (folder === "sim") bucketName = "driver_documents";
        else if (folder === "stnk") bucketName = "driver_documents";
        else if (folder === "kk") bucketName = "driver_documents";
        else bucketName = "driver_documents"; // Default bucket

        // For selfies, don't use a subfolder
        const fileName =
          folder === "selfies"
            ? `selfie_${Date.now()}.jpg`
            : `${folder}/${Date.now()}_${file.name}`;

        console.log(`Uploading to bucket: ${bucketName}, path: ${fileName}`);

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file);

        if (error) {
          console.error(`Upload error for ${folder}:`, error);
          throw new Error(`Failed to upload ${folder} file: ${error.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        if (!publicUrlData?.publicUrl) {
          throw new Error(`Failed to get public URL for ${folder} file`);
        }

        return publicUrlData.publicUrl;
      };

      // Upload all files and get their URLs
      let selfieUrl = null;
      let simUrl = null;
      let stnkUrl = null;
      let kkUrl = null;

      try {
        selfieUrl = await upload(selfie, "selfies");
        console.log("Selfie uploaded successfully:", selfieUrl);

        simUrl = await upload(sim, "sim");
        stnkUrl = await upload(stnk, "stnk");
        kkUrl = await upload(kk, "kk");
      } catch (error) {
        console.error("Error uploading files:", error);
        setIsSubmitting(false);
        throw error;
      }

      console.log("Uploaded files:", { selfieUrl, simUrl, stnkUrl, kkUrl });

      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: "Driver Perusahaan",
          },
        },
      });

      if (authError) {
        console.error("Error creating auth user:", authError);
        alert(`Error creating account: ${authError.message}`);
        setIsSubmitting(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        alert("Failed to create user account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Insert driver data with the file URLs
      const { data, error } = await supabase
        .from("drivers")
        .insert({
          id: userId, // Use the auth user ID
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          reference_phone: formData.referencePhone.trim()
            ? Number(formData.referencePhone)
            : null,
          license_number: formData.licenseNumber,
          license_expiry: licenseExpiry,
          stnk_expiry: stnkExpiry,
          selfie_url: selfieUrl,
          sim_url: simUrl,
          stnk_url: stnkUrl,
          kk_url: kkUrl,
          status: "pending",
          driver_type: "perusahaan",
        })
        .select();

      if (error) {
        console.error("Error creating driver:", error);
        alert(`Error creating driver: ${error.message}`);
        setIsSubmitting(false);
      } else {
        console.log("Driver created successfully:", data);

        // Store driver data in localStorage for immediate access
        const driverData = {
          id: userId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          license_number: formData.licenseNumber,
          license_expiry: licenseExpiry,
          selfie_url: selfieUrl,
          sim_url: simUrl,
          stnk_url: stnkUrl,
          kk_url: kkUrl,
          status: "pending",
          driver_type: "perusahaan",
        };

        localStorage.setItem("driverData", JSON.stringify(driverData));
        localStorage.setItem("userRole", "Driver Perusahaan");
        localStorage.setItem("userId", userId);
        localStorage.setItem("userEmail", formData.email);

        // Store in auth_user for shared authentication
        const userData = {
          id: userId,
          role: "Driver Perusahaan",
          email: formData.email,
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));

        alert("Driver registered successfully! Redirecting to your profile.");

        // Sign in the user automatically after registration
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          console.error("Error signing in after registration:", signInError);
          alert(
            "Account created but couldn't sign in automatically. Please login.",
          );
          setAuthMode("login");
          setShowAuthForm(true);
        } else {
          // Navigate to driver profile page
          setTimeout(() => {
            navigate("/driver-profile");
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="bg-green-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex items-center text-white hover:underline"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </button>
          <span className="ml-4 font-bold">
            Travelintrips <span className="text-yellow-400">★</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent text-white border-white hover:bg-white hover:text-green-800"
            onClick={() => navigate("/driver-profile")}
          >
            <LogIn className="h-4 w-4 mr-1" /> Login
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent text-white border-white hover:bg-white hover:text-green-800"
            onClick={() => {
              alert("Silahkan Register di bawah ini");
              // Scroll to registration form
              window.scrollTo({
                top: 300,
                behavior: "smooth",
              });
            }}
          >
            <User className="h-4 w-4 mr-1" /> Register
          </Button>
        </div>
      </div>

      {showAuthForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <AuthForm
              initialTab={authMode}
              onClose={() => setShowAuthForm(false)}
              onAuthStateChange={(isAuth) => {
                if (isAuth) {
                  console.log(
                    "Auth state changed to authenticated, navigating to profile",
                  );
                  // Small delay to allow auth state to fully update
                  setTimeout(() => {
                    navigate("/driver-profile");
                  }, 500);
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-100 flex justify-center py-10 px-4">
        <div className="bg-white w-full max-w-2xl rounded-xl shadow-md p-6 space-y-6">
          <h2 className="text-xl font-bold text-center">
            Driver Perusahaan Registration
          </h2>

          <div className="space-y-4">
            {[
              "name",
              "email",
              "password",
              "phone",
              "referencePhone",
              "licenseNumber",
            ].map((field) => (
              <div className="space-y-1" key={field}>
                <Label className="font-medium">
                  {field
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (s) => s.toUpperCase())}
                </Label>
                {field === "password" ? (
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      className="pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute top-1/2 right-3 transform -translate-y-1/2 text-sm text-gray-500 hover:underline"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                ) : (
                  <Input
                    type="text"
                    name={field}
                    value={formData[field as keyof typeof formData]}
                    onChange={handleChange}
                    placeholder={
                      field === "email" ? "example@mail.com" : undefined
                    }
                  />
                )}
              </div>
            ))}

            <div className="space-y-1">
              <Label className="font-medium">License Expiry</Label>
              <Calendar
                mode="single"
                selected={licenseExpiry}
                onSelect={setLicenseExpiry}
                className="border rounded-md"
              />
              {licenseExpiry && (
                <p className="text-sm text-muted-foreground">
                  {format(licenseExpiry, "dd MMM yyyy")}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="font-medium">STNK Expiry</Label>
              <Calendar
                mode="single"
                selected={stnkExpiry}
                onSelect={setStnkExpiry}
                className="border rounded-md"
              />
              {stnkExpiry && (
                <p className="text-sm text-muted-foreground">
                  {format(stnkExpiry, "dd MMM yyyy")}
                </p>
              )}
            </div>

            <SelfieCapture selfie={selfie} setSelfie={setSelfie} />
            <UploadField
              label="SIM"
              file={sim}
              onChange={(e) => setSim(e.target.files?.[0] || null)}
            />
            <UploadField
              label="STNK"
              file={stnk}
              onChange={(e) => setStnk(e.target.files?.[0] || null)}
            />
            <UploadField
              label="Kartu Keluarga"
              file={kk}
              onChange={(e) => setKk(e.target.files?.[0] || null)}
            />

            <Button
              onClick={handleSubmit}
              className="w-full bg-green-700 hover:bg-green-800 text-white mt-4"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DriverPerusahaanPage;
