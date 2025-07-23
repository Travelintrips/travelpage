import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { v4 as uuidv4 } from "uuid";

// Define the form schema with Zod
const formSchema = z.object({
  transactionCode: z.string().min(1, "Transaction code is required"),
  date: z.string().min(1, "Date is required"),
  carType: z.string().min(1, "Car type is required"),
  licensePlate: z.string().min(1, "License plate is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  dayCount: z.coerce.number().min(1, "Day count must be at least 1"),
  sellingPrice: z.coerce.number().min(0, "Selling price is required"),
  basicPrice: z.coerce.number().min(0, "Basic price is required"),
  feeSales: z.coerce.number().min(0, "Fee sales is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CarRentalForm = () => {
  const { addToCart } = useShoppingCart();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionCode: `CR-${uuidv4().substring(0, 8)}`,
      date: new Date().toISOString().split("T")[0],
      carType: "",
      licensePlate: "",
      startDate: "",
      endDate: "",
      dayCount: 1,
      sellingPrice: 0,
      basicPrice: 0,
      feeSales: 0,
      notes: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    // Calculate profit
    const profit = data.sellingPrice - data.basicPrice - data.feeSales;

    // Add to cart
    addToCart({
      type: "car",
      transactionCode: data.transactionCode,
      date: data.date,
      sellingPrice: data.sellingPrice,
      basicPrice: data.basicPrice,
      feeSales: data.feeSales,
      profit: profit,
      details: {
        carType: data.carType,
        licensePlate: data.licensePlate,
        startDate: data.startDate,
        endDate: data.endDate,
        dayCount: data.dayCount,
      },
      notes: data.notes,
    });

    // Reset form with a new transaction code
    form.reset({
      ...form.getValues(),
      transactionCode: `CR-${uuidv4().substring(0, 8)}`,
      carType: "",
      licensePlate: "",
      startDate: "",
      endDate: "",
      dayCount: 1,
      sellingPrice: 0,
      basicPrice: 0,
      feeSales: 0,
      notes: "",
    });
  };

  // Calculate profit dynamically
  const sellingPrice = form.watch("sellingPrice") || 0;
  const basicPrice = form.watch("basicPrice") || 0;
  const feeSales = form.watch("feeSales") || 0;
  const profit = sellingPrice - basicPrice - feeSales;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transactionCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction Code</FormLabel>
                <FormControl>
                  <Input {...field} readOnly />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="carType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Car Type</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Toyota Avanza" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="licensePlate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Plate</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. B 1234 ABC" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dayCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Days</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="basicPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Basic Price</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="feeSales"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fee Sales</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between p-4 border rounded-md bg-gray-50">
            <span className="font-medium">Profit:</span>
            <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
              {profit.toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
              })}
            </span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Additional notes about this car rental"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              const formData = form.getValues();
              const profit =
                formData.sellingPrice - formData.basicPrice - formData.feeSales;

              try {
                await addToCart({
                  item_type: "car",
                  service_name: `${formData.carType} - ${formData.licensePlate}`,
                  price: formData.sellingPrice,
                  details: {
                    carType: formData.carType,
                    licensePlate: formData.licensePlate,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    dayCount: formData.dayCount,
                    basicPrice: formData.basicPrice,
                    feeSales: formData.feeSales,
                    profit: profit,
                    notes: formData.notes,
                  },
                });

                // Reset form after adding to cart
                form.reset({
                  ...form.getValues(),
                  transactionCode: `CR-${uuidv4().substring(0, 8)}`,
                  carType: "",
                  licensePlate: "",
                  startDate: "",
                  endDate: "",
                  dayCount: 1,
                  sellingPrice: 0,
                  basicPrice: 0,
                  feeSales: 0,
                  notes: "",
                });

                alert("Item berhasil ditambahkan ke keranjang!");
              } catch (error) {
                console.error("Error adding to cart:", error);
                alert("Gagal menambahkan ke keranjang");
              }
            }}
          >
            Add to Cart
          </Button>
          <Button type="submit" className="w-full">
            Book Now
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CarRentalForm;
