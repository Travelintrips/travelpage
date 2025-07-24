import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
const passengerHandlingSchema = z.object({
  serviceName: z.string().min(1, { message: "Service name is required" }),
  location: z.string().min(1, { message: "Location is required" }),
  passengerCount: z.coerce
    .number()
    .min(1, { message: "At least 1 passenger is required" }),
  date: z.string().min(1, { message: "Date is required" }),
  basicPrice: z.coerce
    .number()
    .min(0, { message: "Basic price must be a positive number" }),
  sellingPrice: z.coerce
    .number()
    .min(0, { message: "Selling price must be a positive number" }),
  feeSales: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type PassengerHandlingFormValues = z.infer<typeof passengerHandlingSchema>;

const PassengerHandlingForm = () => {
  const { addToCart } = useShoppingCart();

  const form = useForm<PassengerHandlingFormValues>({
    resolver: zodResolver(passengerHandlingSchema),
    defaultValues: {
      serviceName: "",
      location: "",
      passengerCount: 1,
      date: new Date().toISOString().split("T")[0],
      basicPrice: 0,
      sellingPrice: 0,
      feeSales: 0,
      notes: "",
    },
  });

  const onSubmit = (data: PassengerHandlingFormValues) => {
    // Calculate profit
    const profit = data.sellingPrice - data.basicPrice - (data.feeSales || 0);

    // Add to cart
    addToCart({
      item_type: "passenger_handling",
      service_name: `${data.serviceName} - ${data.location}`,
      price: data.sellingPrice,
      quantity: 1,
      details: {
        transactionCode: `PSG-${uuidv4().substring(0, 8)}`,
        date: data.date,
        serviceName: data.serviceName,
        location: data.location,
        passengerCount: data.passengerCount,
        basicPrice: data.basicPrice,
        feeSales: data.feeSales || 0,
        profit: profit,
        notes: data.notes,
      },
    });

    // Reset form
    form.reset({
      serviceName: "",
      location: "",
      passengerCount: 1,
      date: new Date().toISOString().split("T")[0],
      basicPrice: 0,
      sellingPrice: 0,
      feeSales: 0,
      notes: "",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="serviceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Layanan</FormLabel>
                <FormControl>
                  <Input placeholder="Airport Transfer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lokasi</FormLabel>
                <FormControl>
                  <Input placeholder="Bandara Soekarno-Hatta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passengerCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jumlah Penumpang</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
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
                <FormLabel>Tanggal</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <FormLabel>Harga Dasar</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
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
                <FormLabel>Harga Jual</FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catatan</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tambahkan catatan jika diperlukan"
                  {...field}
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
                formData.sellingPrice -
                formData.basicPrice -
                (formData.feeSales || 0);

              try {
                await addToCart({
                  item_type: "passenger_handling",
                  service_name: `${formData.serviceName} - ${formData.location}`,
                  price: formData.sellingPrice,
                  quantity: 1,
                  details: {
                    serviceName: formData.serviceName,
                    location: formData.location,
                    passengerCount: formData.passengerCount,
                    date: formData.date,
                    basicPrice: formData.basicPrice,
                    feeSales: formData.feeSales || 0,
                    profit: profit,
                    notes: formData.notes,
                  },
                });

                // Reset form after adding to cart
                form.reset({
                  serviceName: "",
                  location: "",
                  passengerCount: 1,
                  date: new Date().toISOString().split("T")[0],
                  basicPrice: 0,
                  sellingPrice: 0,
                  feeSales: 0,
                  notes: "",
                });

                alert(
                  "Layanan passenger handling berhasil ditambahkan ke keranjang!",
                );
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

export default PassengerHandlingForm;
