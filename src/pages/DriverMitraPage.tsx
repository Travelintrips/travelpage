import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { UploadCloud, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const UploadField = ({
  label,
  placeholder,
  file,
  onChange,
}: {
  label: string;
  placeholder: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="space-y-1">
    <Label className="font-medium">{label}</Label>
    <div className="relative flex items-center">
      <Input
        type="text"
        placeholder={placeholder}
        value={file ? file.name : ""}
        className="pr-10"
        readOnly
      />
      <input
        type="file"
        accept="image/*"
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <UploadCloud className="absolute right-3 h-5 w-5 text-gray-500 pointer-events-none" />
    </div>
  </div>
);

const DriverMitraPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    referencePhone: "",
    licenseNumber: "",
  });

  const [licenseExpiry, setLicenseExpiry] = useState<Date | null>(null);
  const [stnkExpiry, setStnkExpiry] = useState<Date | null>(null);

  const [selfie, setSelfie] = useState<File | null>(null);
  const [sim, setSim] = useState<File | null>(null);
  const [stnk, setStnk] = useState<File | null>(null);
  const [kk, setKk] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form Submitted", {
      ...formData,
      licenseExpiry,
      stnkExpiry,
      selfie,
      sim,
      stnk,
      kk,
    });
    alert("Account created (simulasi)");
  };

  return (
    <>
      {/* Top Navbar */}
      <div className="bg-green-800 text-white px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-white hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <span className="ml-4 font-bold">
          Travelintrips <span className="text-yellow-400">★</span>
        </span>
      </div>

      {/* Form Section */}
      <div className="min-h-screen bg-gray-100 flex justify-center py-10 px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white w-full max-w-2xl rounded-xl shadow-md p-6 space-y-6"
        >
          <h2 className="text-xl font-bold text-center">
            Driver Mitra Registration
          </h2>

          <div className="space-y-4">
            {[
              {
                name: "name",
                label: "Name",
                type: "text",
                placeholder: "John Doe",
              },
              {
                name: "email",
                label: "Email",
                type: "email",
                placeholder: "email@example.com",
              },
              {
                name: "phone",
                label: "Phone",
                type: "text",
                placeholder: "+62...",
              },
              {
                name: "referencePhone",
                label: "Reference Phone",
                type: "text",
                placeholder: "+62...",
              },
              {
                name: "licenseNumber",
                label: "License Number",
                type: "text",
                placeholder: "License Number",
              },
            ].map((field) => (
              <div className="space-y-1" key={field.name}>
                <Label className="font-medium">{field.label}</Label>
                <Input
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.name as keyof typeof formData]}
                  onChange={handleChange}
                />
              </div>
            ))}

            {/* License Expiry */}
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

            {/* STNK Expiry */}
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

            {/* Upload Fields */}
            <UploadField
              label="Selfie"
              placeholder="Enter Selfie URL or upload"
              file={selfie}
              onChange={(e) => setSelfie(e.target.files?.[0] || null)}
            />
            <UploadField
              label="SIM"
              placeholder="Enter SIM URL or upload"
              file={sim}
              onChange={(e) => setSim(e.target.files?.[0] || null)}
            />
            <UploadField
              label="STNK"
              placeholder="Enter STNK URL or upload"
              file={stnk}
              onChange={(e) => setStnk(e.target.files?.[0] || null)}
            />
            <UploadField
              label="Kartu Keluarga"
              placeholder="Enter Kartu Keluarga URL or upload"
              file={kk}
              onChange={(e) => setKk(e.target.files?.[0] || null)}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default DriverMitraPage;
