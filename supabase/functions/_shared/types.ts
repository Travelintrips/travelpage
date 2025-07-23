import { Database } from "./database.types";

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

export type ErrorResponse = {
  error: string;
  status: number;
};
