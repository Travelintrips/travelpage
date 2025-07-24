import React from "react";
import { Control, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { RegisterFormValues } from "../RegistrationForm";
import { format } from "date-fns";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StaffFormProps {
  control: Control<RegisterFormValues>;
  watch: UseFormWatch<RegisterFormValues>;
  setValue: UseFormSetValue<RegisterFormValues>;
  existingImages: {
    idCard: string;
    ktp: string;
    sim: string;
    kk: string;
    skck: string;
  };
}

const StaffForm: React.FC<StaffFormProps> = ({
  control,
  watch,
  setValue,
  existingImages,
}) => {
  return (
    <div className="space-y-4 border p-4 rounded-md bg-muted/30">
      <h3 className="font-medium">Staff Information</h3>

      <FormField
        control={control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pilih Role</FormLabel>
            <Select
              onValueChange={(val) => {
                const roleName = {
                  "4": "Staff",
                  "5": "Staff Traffic",
                  "6": "Staff Admin",
                  "7": "Staff Trips",
                  "8": "Dispatcher",
                  "9": "Pengawas",
                }[val];
                setValue("role", roleName || "Staff");
                field.onChange(roleName || "Staff");
              }}
              value={String(field.value || "")}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role staff" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="Staff Traffic">Staff Traffic</SelectItem>
                <SelectItem value="Staff Admin">Staff Admin</SelectItem>
                <SelectItem value="Staff Trips">Staff Trips</SelectItem>
                <SelectItem value="Dispatcher">Dispatcher</SelectItem>
                <SelectItem value="Pengawas">Pengawas</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Depan</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama depan" {...field} />
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
                <Input placeholder="Masukkan nama belakang" {...field} />
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
            <FormLabel>Alamat KTP</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Masukkan alamat sesuai KTP"
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nomor Telepon</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nomor telepon" {...field} />
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
              <FormLabel>Nomor Telepon Keluarga</FormLabel>
              <FormControl>
                <Input
                  placeholder="Masukkan nomor telepon keluarga"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="ktpNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nomor KTP</FormLabel>
            <FormControl>
              <Input placeholder="Masukkan nomor KTP" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="religion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agama</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih agama" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Islam">Islam</SelectItem>
                  <SelectItem value="Kristen">Kristen</SelectItem>
                  <SelectItem value="Katolik">Katolik</SelectItem>
                  <SelectItem value="Hindu">Hindu</SelectItem>
                  <SelectItem value="Buddha">Buddha</SelectItem>
                  <SelectItem value="Konghucu">Konghucu</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="ethnicity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Suku</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan suku" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* <FormField
        control={control}
        name="licenseExpiry"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Masa Berlaku SIM 2 (Date)</FormLabel>
            <FormControl>
              <Input
                type="date"
                placeholder="Pilih tanggal"
                {...field}
                value={field.value || ""}
                onChange={(e) => {
                  field.onChange(e.target.value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      /> */}

      <FormField
        control={control}
        name="department"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Department</FormLabel>
            <FormControl>
              <Input placeholder="Enter department" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="position"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Position</FormLabel>
            <FormControl>
              <Input placeholder="Enter position" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="employeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Employee ID</FormLabel>
            <FormControl>
              <Input placeholder="Enter employee ID" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Document Uploads */}
      <div className="space-y-4">
        <h4 className="font-medium">Document Uploads</h4>

        {/* KTP Upload */}
        <div className="space-y-2">
          <FormLabel>Upload Foto KTP</FormLabel>
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
        </div>

        {/* SIM Upload */}
        <div className="space-y-2">
          <FormLabel>Upload Foto SIM</FormLabel>
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
        </div>

        {/* KK Upload */}
        <div className="space-y-2">
          <FormLabel>Upload Foto Kartu Keluarga</FormLabel>
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
          {existingImages.kk && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">
                Existing KK Image:
              </p>
              <img
                src={existingImages.kk}
                alt="Kartu Keluarga"
                className="w-full max-h-32 object-contain mb-2 border rounded"
              />
            </div>
          )}
        </div>

        {/* SKCK Upload */}
        <div className="space-y-2">
          <FormLabel>Upload SKCK</FormLabel>
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
        </div>

        {/* ID Card Upload */}
        <div className="space-y-2">
          <FormLabel>ID Card Image</FormLabel>
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              id="idcard-upload"
              className="cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const imageData = event.target?.result as string;
                    if (imageData) {
                      setValue("idCardImage", imageData);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
          {existingImages.idCard && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">
                Existing ID Card Image:
              </p>
              <img
                src={existingImages.idCard}
                alt="ID Card"
                className="w-full max-h-32 object-contain mb-2 border rounded"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Upload a photo of your ID Card - Required for staff registration
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffForm;
