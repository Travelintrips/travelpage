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
const flightBookingSchema = z.object({
  airline: z.string().min(1, { message: "Airline is required" }),
  route: z.string().min(1, { message: "Route is required" }),
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

type FlightBookingFormValues = z.infer<typeof flightBookingSchema>;

const FlightBookingForm = () => {
  const { addToCart } = useShoppingCart();

  const form = useForm<FlightBookingFormValues>({
    resolver: zodResolver(flightBookingSchema),
    defaultValues: {
      airline: "",
      route: "",
      passengerCount: 1,
      date: new Date().toISOString().split("T")[0],
      basicPrice: 0,
      sellingPrice: 0,
      feeSales: 0,
      notes: "",
    },
  });

  const onSubmit = (data: FlightBookingFormValues) => {
    // Calculate profit
    const profit = data.sellingPrice - data.basicPrice - (data.feeSales || 0);

    // Add to cart
    addToCart({
      type: "flight",
      transactionCode: `FLT-${uuidv4().substring(0, 8)}`,
      date: data.date,
      sellingPrice: data.sellingPrice,
      basicPrice: data.basicPrice,
      feeSales: data.feeSales || 0,
      profit: profit,
      details: {
        airline: data.airline,
        route: data.route,
        passengerCount: data.passengerCount,
      },
      notes: data.notes,
    });

    // Reset form
    form.reset({
      airline: "",
      route: "",
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
            name="airline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maskapai</FormLabel>
                <FormControl>
                  <Input placeholder="Garuda Indonesia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="route"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rute</FormLabel>
                <FormControl>
                  <Input placeholder="Jakarta - Bali" {...field} />
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
                  item_type: "airport_transfer", // Using airport_transfer as closest match
                  service_name: `${formData.airline} - ${formData.route}`,
                  price: formData.sellingPrice,
                  details: {
                    airline: formData.airline,
                    route: formData.route,
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
                  airline: "",
                  route: "",
                  passengerCount: 1,
                  date: new Date().toISOString().split("T")[0],
                  basicPrice: 0,
                  sellingPrice: 0,
                  feeSales: 0,
                  notes: "",
                });

                alert("Tiket pesawat berhasil ditambahkan ke keranjang!");
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

export default FlightBookingForm;
