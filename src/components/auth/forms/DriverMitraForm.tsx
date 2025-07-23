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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DriverMitraFormProps {
  control: Control<RegisterFormValues>;
  watch: UseFormWatch<RegisterFormValues>;
  setValue: UseFormSetValue<RegisterFormValues>;
}

const DriverMitraForm: React.FC<DriverMitraFormProps> = ({
  control,
  watch,
  setValue,
}) => {
  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-border">
      <h4 className="font-medium">Vehicle Information</h4>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="make"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Make</FormLabel>
              <FormControl>
                <Input placeholder="Toyota" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <FormControl>
                <Input placeholder="Avanza" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year</FormLabel>
              <FormControl>
                <Input
                  placeholder="2020"
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Input placeholder="Silver" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="license_plate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>License Plate</FormLabel>
            <FormControl>
              <Input placeholder="B 1234 CD" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || ""}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="MPV">MPV</SelectItem>
                  <SelectItem value="Hatchback">Hatchback</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || ""}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Economy">Economy</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="seats"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seats</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value?.toString()}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select seats" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="transmission"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transmission</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || ""}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transmission" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Automatic">Automatic</SelectItem>
                  <SelectItem value="CVT">CVT</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="fuel_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Fuel Type</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value || ""}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Petrol">Petrol</SelectItem>
                <SelectItem value="Diesel">Diesel</SelectItem>
                <SelectItem value="Electric">Electric</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2 mt-4 pt-4 border-t border-border">
        <h4 className="font-medium">Required Documents</h4>

        <div className="space-y-2">
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
          {watch("kkImage") && (
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
          )}
          <p className="text-xs text-muted-foreground">
            Upload a photo of your KK (Family Card) - Required for Driver Mitra
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
          {watch("stnkImage") && (
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
          )}
          <p className="text-xs text-muted-foreground">
            Upload a photo of your STNK (Vehicle Registration) - Required for
            Driver Mitra
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverMitraForm;
