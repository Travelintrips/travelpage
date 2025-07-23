import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date to DD/MM/YYYY format for user display
 * @param dateString ISO date string or Date object
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDate(dateString: string | Date): string {
  try {
    return dayjs(dateString).format("DD/MM/YYYY");
  } catch (e) {
    console.error("Error formatting date:", e);
    return String(dateString);
  }
}

/**
 * Format a date to ISO string for database storage
 * @param date Date object or string to convert
 * @returns ISO date string
 */
export function toISOString(date: Date | string): string {
  try {
    if (typeof date === "string") {
      return new Date(date).toISOString();
    }
    return date.toISOString();
  } catch (e) {
    console.error("Error converting to ISO string:", e);
    return new Date().toISOString(); // Fallback to current date
  }
}

/**
 * Parse an ISO date string to a Date object
 * @param isoString ISO date string
 * @returns Date object
 */
export function parseISODate(isoString: string): Date {
  try {
    return new Date(isoString);
  } catch (e) {
    console.error("Error parsing ISO date:", e);
    return new Date(); // Fallback to current date
  }
}
