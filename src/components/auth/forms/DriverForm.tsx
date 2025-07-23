import React from "react";
import { Control, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { RegisterFormValues } from "../RegistrationForm";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface DriverFormProps {
  control: Control<RegisterFormValues>;
  watch: UseFormWatch<RegisterFormValues>;
  setValue: UseFormSetValue<RegisterFormValues>;
  existingImages: {
    ktp: string;
    sim: string;
    skck: string;
    kk?: string;
    stnk?: string;
  };
}

const DriverForm: React.FC<DriverFormProps> = ({
  control,
  watch,
  setValue,
  existingImages,
}) => {
  const driverType = watch("role");

  return (
    <div className="space-y-4 border p-4 rounded-md bg-muted/30">
      <h3 className="font-medium">Driver Information</h3>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Depan</FormLabel>
              <FormControl>
                <Input placeholder="Nama depan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Belakang</FormLabel>
              <FormControl>
                <Input placeholder="Nama belakang" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Alamat</FormLabel>
            <FormControl>
              <Input placeholder="Alamat lengkap" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="birthPlace"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tempat Lahir</FormLabel>
              <FormControl>
                <Input placeholder="Kota kelahiran" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="birthDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tanggal Lahir</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="religion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agama</FormLabel>
            <FormControl>
              <Input placeholder="Agama" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="licenseNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>License Number (SIM)</FormLabel>
            <FormControl>
              <Input placeholder="Enter license number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="licenseExpiry"
        render={({ field }) => (
          <FormItem>
            <FormLabel>License Expiry Date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="referencePhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reference Phone Number</FormLabel>
            <FormControl>
              <Input placeholder="+1234567890" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <FormLabel>KTP Image</FormLabel>
        <div className="relative">
          <Input
            type="file"
            accept="image/*"
            id="ktp-upload"
            className="cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const imageData = event.target?.result as string;
                  if (imageData) {
                    setValue("ktpImage", imageData);
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>
        {existingImages.ktp && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">
              Existing KTP Image:
            </p>
            <img
              src={existingImages.ktp}
              alt="KTP"
              className="w-full max-h-32 object-contain mb-2 border rounded"
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Upload a photo of your KTP (ID card) - Required for driver
          registration
        </p>
      </div>

      <div className="space-y-2">
        <FormLabel>SIM Image</FormLabel>
        <div className="relative">
          <Input
            type="file"
            accept="image/*"
            id="sim-upload"
            className="cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const imageData = event.target?.result as string;
                  if (imageData) {
                    setValue("simImage", imageData);
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>
        {existingImages.sim && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">
              Existing SIM Image:
            </p>
            <img
              src={existingImages.sim}
              alt="SIM"
              className="w-full max-h-32 object-contain mb-2 border rounded"
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Upload a photo of your SIM (Driver's License) - Required for driver
          registration
        </p>
      </div>

      {/* Driver Perusahaan specific fields */}
      {driverType === "Driver Perusahaan" && (
        <div className="space-y-2 mt-4 pt-4 border-t border-border">
          <h4 className="font-medium">Driver Perusahaan Documents</h4>
          <FormLabel>SKCK Image</FormLabel>
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              id="skck-upload"
              className="cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const imageData = event.target?.result as string;
                    if (imageData) {
                      setValue("skckImage", imageData);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
          {existingImages.skck && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">
                Existing SKCK Image:
              </p>
              <img
                src={existingImages.skck}
                alt="SKCK"
                className="w-full max-h-32 object-contain mb-2 border rounded"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Upload a photo of your SKCK (Police Clearance Certificate) -
            Required for Driver Perusahaan
          </p>

          {/* KK and STNK for Driver Perusahaan */}
          <div className="space-y-2 mt-4">
            <FormLabel>KK Image (Family Card)</FormLabel>
            <div className="relative">
              <Input
                type="file"
                accept="image/*"
                id="kk-upload"
                className="cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const imageData = event.target?.result as string;
                      if (imageData) {
                        setValue("kkImage", imageData);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
            {existingImages.kk ? (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Existing KK Image:
                </p>
                <img
                  src={existingImages.kk}
                  alt="KK"
                  className="w-full max-h-32 object-contain mb-2 border rounded"
                />
              </div>
            ) : (
              watch("kkImage") && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Selected KK Image:
                  </p>
                  <img
                    src={watch("kkImage")}
                    alt="KK"
                    className="w-full max-h-32 object-contain mb-2 border rounded"
                  />
                </div>
              )
            )}
            <p className="text-xs text-muted-foreground">
              Upload a photo of your KK (Family Card) - Required for Driver
              Perusahaan
            </p>
          </div>

          <div className="space-y-2">
            <FormLabel>STNK Image (Vehicle Registration)</FormLabel>
            <div className="relative">
              <Input
                type="file"
                accept="image/*"
                id="stnk-upload"
                className="cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const imageData = event.target?.result as string;
                      if (imageData) {
                        setValue("stnkImage", imageData);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
            {existingImages.stnk ? (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Existing STNK Image:
                </p>
                <img
                  src={existingImages.stnk}
                  alt="STNK"
                  className="w-full max-h-32 object-contain mb-2 border rounded"
                />
              </div>
            ) : (
              watch("stnkImage") && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Selected STNK Image:
                  </p>
                  <img
                    src={watch("stnkImage")}
                    alt="STNK"
                    className="w-full max-h-32 object-contain mb-2 border rounded"
                  />
                </div>
              )
            )}
            <p className="text-xs text-muted-foreground">
              Upload a photo of your STNK (Vehicle Registration) - Required for
              Driver Perusahaan
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverForm;
