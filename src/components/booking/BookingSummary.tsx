import React from "react";
import { Separator } from "@/components/ui/separator";

interface BookingSummaryProps {
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear?: number;
  totalDays: number;
  basePrice: number;
  driverFee: number;
  totalAmount: number;
  depositAmount: number;
  isPartialPayment: boolean;
  itemName?: string;
  baggageSize?: string;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  vehicleMake,
  vehicleModel,
  vehicleYear,
  totalDays,
  basePrice,
  driverFee,
  totalAmount,
  depositAmount,
  isPartialPayment,
  itemName,
  baggageSize,
}) => {
  // Format currency to IDR
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-muted p-4 rounded-lg">
      <h3 className="font-medium mb-2">Booking Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Vehicle:</span>
          <span className="font-medium">
            {vehicleMake} {vehicleModel} {vehicleYear && `(${vehicleYear})`}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Duration:</span>
          <span className="font-medium">{totalDays} day(s)</span>
        </div>
        {baggageSize === "electronic" && itemName && (
          <div className="flex justify-between">
            <span>Item Name:</span>
            <span className="font-medium">{itemName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Base Price:</span>
          <span className="font-medium">{formatCurrency(basePrice)}</span>
        </div>
        {driverFee > 0 && (
          <div className="flex justify-between">
            <span>Driver Fee:</span>
            <span className="font-medium">{formatCurrency(driverFee)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold">
          <span>Total Amount:</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        {isPartialPayment && (
          <div className="flex justify-between text-primary font-medium">
            <span>Deposit Due Now:</span>
            <span>{formatCurrency(depositAmount)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingSummary;
