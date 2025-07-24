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
const hotelBookingSchema = z.object({
  hotelName: z.string().min(1, { message: "Hotel name is required" }),
  location: z.string().min(1, { message: "Location is required" }),
  checkInDate: z.string().min(1, { message: "Check-in date is required" }),
  checkOutDate: z.string().min(1, { message: "Check-out date is required" }),
  roomCount: z.coerce
    .number()
    .min(1, { message: "At least 1 room is required" }),
  nightCount: z.coerce
    .number()
    .min(1, { message: "At least 1 night is required" }),
  date: z.string().min(1, { message: "Transaction date is required" }),
  basicPrice: z.coerce
    .number()
    .min(0, { message: "Basic price must be a positive number" }),
  sellingPrice: z.coerce
    .number()
    .min(0, { message: "Selling price must be a positive number" }),
  feeSales: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type HotelBookingFormValues = z.infer<typeof hotelBookingSchema>;

const HotelBookingForm = () => {
  const { addToCart } = useShoppingCart();

  const form = useForm<HotelBookingFormValues>({
    resolver: zodResolver(hotelBookingSchema),
    defaultValues: {
      hotelName: "",
      location: "",
      checkInDate: new Date().toISOString().split("T")[0],
      checkOutDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
      roomCount: 1,
      nightCount: 1,
      date: new Date().toISOString().split("T")[0],
      basicPrice: 0,
      sellingPrice: 0,
      feeSales: 0,
      notes: "",
    },
  });

  const onSubmit = (data: HotelBookingFormValues) => {
    // Calculate profit
    const profit = data.sellingPrice - data.basicPrice - (data.feeSales || 0);

    // Add to cart
    addToCart({
      item_type: "hotel",
      service_name: `${data.hotelName} - ${data.location}`,
      price: data.sellingPrice,
      quantity: 1,
      details: {
        transactionCode: `HTL-${uuidv4().substring(0, 8)}`,
        date: data.date,
        hotelName: data.hotelName,
        location: data.location,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        roomCount: data.roomCount,
        nightCount: data.nightCount,
        basicPrice: data.basicPrice,
        feeSales: data.feeSales || 0,
        profit: profit,
        notes: data.notes,
      },
    });

    // Reset form
    form.reset({
      hotelName: "",
      location: "",
      checkInDate: new Date().toISOString().split("T")[0],
      checkOutDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      roomCount: 1,
      nightCount: 1,
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
            name="hotelName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Hotel</FormLabel>
                <FormControl>
                  <Input placeholder="Grand Hyatt" {...field} />
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
                  <Input placeholder="Jakarta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkInDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Check-in</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkOutDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Check-out</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roomCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jumlah Kamar</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nightCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jumlah Malam</FormLabel>
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
                <FormLabel>Tanggal Transaksi</FormLabel>
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
                  item_type: "hotel",
                  service_name: `${formData.hotelName} - ${formData.location}`,
                  price: formData.sellingPrice,
                  quantity: 1,
                  details: {
                    hotelName: formData.hotelName,
                    location: formData.location,
                    checkInDate: formData.checkInDate,
                    checkOutDate: formData.checkOutDate,
                    roomCount: formData.roomCount,
                    nightCount: formData.nightCount,
                    date: formData.date,
                    basicPrice: formData.basicPrice,
                    feeSales: formData.feeSales || 0,
                    profit: profit,
                    notes: formData.notes,
                  },
                });

                // Reset form after adding to cart
                form.reset({
                  hotelName: "",
                  location: "",
                  checkInDate: new Date().toISOString().split("T")[0],
                  checkOutDate: new Date(Date.now() + 86400000)
                    .toISOString()
                    .split("T")[0],
                  roomCount: 1,
                  nightCount: 1,
                  date: new Date().toISOString().split("T")[0],
                  basicPrice: 0,
                  sellingPrice: 0,
                  feeSales: 0,
                  notes: "",
                });

                alert("Hotel berhasil ditambahkan ke keranjang!");
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

export default HotelBookingForm;
